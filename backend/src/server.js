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

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());

// Auth routes
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

function createItems() {
  items.clear();
  items.set("1", {
    id: "1",
    title: "MacBook Pro",
    currentBid: 50000,
    endTime: Date.now() + 5 * 60 * 1000,
    highestBidder: null,
  });
  items.set("2", {
    id: "2",
    title: "iPhone 15",
    currentBid: 30000,
    endTime: Date.now() + 5 * 60 * 1000,
    highestBidder: null,
  });
}
createItems();

setInterval(() => {
  console.log("Resetting auctions...");
  createItems();
  io.emit("RESET_ITEMS", Array.from(items.values()));
}, 5 * 60 * 1000);

app.get("/items", (req, res) => {
  res.json({
    serverTime: Date.now(),
    items: Array.from(items.values()),
  });
});

/* -------------------- SOCKET LOGIC -------------------- */

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id} | role: ${socket.data.user?.role}`);

  socket.on("BID_PLACED", async (data) => {
    // Only bidders can place bids
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
      item.highestBidder = socket.data.user.sub; // user ID now, not socket.id

      console.log(`New bid on ${item.title}: ₹${bidAmount} by ${socket.data.user.email}`);
      io.emit("UPDATE_BID", item);
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