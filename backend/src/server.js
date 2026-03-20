import 'dotenv/config';
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { Mutex } from "async-mutex";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import authRouter from "./auth/authRouter.js";
import { publisher, subscriber } from "./redis/pubsub.js";
import { pool } from "./db/pool.js";
import { auctionQueue, auctionWorker } from './queues/auctionQueue.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// Socket JWT auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = payload;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

/* -------------------- AUCTION DATA -------------------- */

const items = new Map();
const mutex = new Mutex();

async function createItems() {
  items.clear();

  const auctions = [
    { id: "1", title: "MacBook Pro", currentBid: 50000 },
    { id: "2", title: "iPhone 15", currentBid: 30000 },
  ];

  for (const auction of auctions) {
    const endTime = Date.now() + 5 * 60 * 1000;
    items.set(auction.id, {
      ...auction,
      endTime,
      highestBidder: null,
    });

    await auctionQueue.add(
      'auction-expired',
      { auctionId: auction.id, auctionTitle: auction.title },
      { delay: 5 * 60 * 1000, jobId: `expiry-${auction.id}-${Date.now()}` }
    );

    console.log(`Scheduled expiry job for: ${auction.title}`);
  }
}

await createItems();

setInterval(async () => {
  console.log("Resetting auctions...");
  await createItems();
  publisher.publish("auction:events", JSON.stringify({
    type: "RESET_ITEMS",
    data: Array.from(items.values()),
  }));
}, 5 * 60 * 1000);

app.get("/items", (req, res) => {
  res.json({
    serverTime: Date.now(),
    items: Array.from(items.values()),
  });
});

/* -------------------- REDIS SUBSCRIBER -------------------- */

await subscriber.subscribe("auction:events");

subscriber.on("message", (channel, message) => {
  if (channel !== "auction:events") return;
  const event = JSON.parse(message);

  if (event.type === "UPDATE_BID") {
    io.emit("UPDATE_BID", event.data);
  } else if (event.type === "RESET_ITEMS") {
    io.emit("RESET_ITEMS", event.data);
  }
});

/* -------------------- SOCKET LOGIC -------------------- */

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id} | role: ${socket.data.user?.role}`);

  socket.on("BID_PLACED", async (data) => {
    if (socket.data.user?.role !== "bidder") {
      socket.emit("BID_ERROR", "Only bidders can place bids");
      return;
    }

    const release = await mutex.acquire();
    try {
      const { itemId, bidAmount } = data;
      const item = items.get(itemId);

      if (!item) { socket.emit("BID_ERROR", "Item not found"); return; }
      if (Date.now() > item.endTime) { socket.emit("BID_ERROR", "Auction ended"); return; }
      if (bidAmount <= item.currentBid) { socket.emit("OUTBID"); return; }

      item.currentBid = bidAmount;
      item.highestBidder = socket.data.user.sub;

      await pool.query(
        `INSERT INTO bids(auction_id, bidder_id, amount) VALUES($1,$2,$3)`,
        [itemId, socket.data.user.sub, bidAmount]
      );

      console.log(`New bid on ${item.title}: ₹${bidAmount} by ${socket.data.user.email}`);

      await publisher.publish("auction:events", JSON.stringify({
        type: "UPDATE_BID",
        data: item,
      }));

    } catch (err) {
      console.error(err);
      socket.emit("BID_ERROR", "Something went wrong");
    } finally {
      release();
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/* -------------------- SERVER -------------------- */

server.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});