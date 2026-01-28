import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { Mutex } from "async-mutex";

const app = express();
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

/* -------------------- AUCTION DATA -------------------- */

const items = new Map();
const mutex = new Mutex();

function createItems() {
  items.clear();
  
  const now= Date.now();
  const duration= 5*60*1000;

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

// Auto reset every 5 min
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
  console.log("User connected:", socket.id);

  /* Handle Bid */
  socket.on("BID_PLACED", async (data) => {
    const release = await mutex.acquire();

    try {
      const { itemId, bidAmount } = data;

      const item = items.get(itemId);

      if (!item) {
        socket.emit("BID_ERROR", "Item not found");
        return;
      }

      // Check auction end
      if (Date.now() > item.endTime) {
        socket.emit("BID_ERROR", "Auction ended");
        return;
      }

      // Check bid validity
      if (bidAmount <= item.currentBid) {
        socket.emit("OUTBID");
        return;
      }

      // Update bid
      item.currentBid = bidAmount;
      item.highestBidder = socket.id;

      console.log(
        `New bid on ${item.title}: ₹${bidAmount} by ${socket.id}`
      );

      // Broadcast update
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

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
