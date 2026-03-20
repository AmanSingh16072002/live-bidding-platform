import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { Mutex } from 'async-mutex';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import authRouter from './auth/authRouter.js';
import { publisher, subscriber } from './redis/pubsub.js';
import { pool } from './db/pool.js';
import { auctionQueue, auctionWorker } from './queues/auctionQueue.js';
import { AuthPayload } from './middleware/auth.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
});

/* -------------------- TYPES -------------------- */

interface AuctionItem {
  id: string;
  title: string;
  currentBid: number;
  endTime: number;
  highestBidder: string | null;
}

/* -------------------- SOCKET AUTH -------------------- */

io.use((socket: Socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Authentication required'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

/* -------------------- AUCTION DATA -------------------- */

const items = new Map<string, AuctionItem>();
const mutex = new Mutex();

async function createItems(): Promise<void> {
  items.clear();

  await pool.query(`DELETE FROM bids`);
  await pool.query(`DELETE FROM auctions`);

  const auctions = [
    { title: 'MacBook Pro', start_price: 50000 },
    { title: 'iPhone 15', start_price: 30000 },
  ];

  for (const auction of auctions) {
    const endTime = new Date(Date.now() + 5 * 60 * 1000);

    const { rows } = await pool.query(
      `INSERT INTO auctions(title, start_price, end_time)
       VALUES($1, $2, $3) RETURNING id, title, start_price`,
      [auction.title, auction.start_price, endTime]
    );

    const dbAuction = rows[0] as { id: string; title: string; start_price: string };

    items.set(dbAuction.id, {
      id: dbAuction.id,
      title: dbAuction.title,
      currentBid: Number(dbAuction.start_price),
      endTime: endTime.getTime(),
      highestBidder: null,
    });

    await auctionQueue.add(
      'auction-expired',
      { auctionId: dbAuction.id, auctionTitle: dbAuction.title },
      { delay: 5 * 60 * 1000, jobId: `expiry-${dbAuction.id}-${Date.now()}` }
    );

    console.log(`Scheduled expiry job for: ${dbAuction.title} (${dbAuction.id})`);
  }
}

await createItems();

setInterval(async () => {
  console.log('Resetting auctions...');
  await createItems();
  publisher.publish('auction:events', JSON.stringify({
    type: 'RESET_ITEMS',
    data: Array.from(items.values()),
  }));
}, 5 * 60 * 1000);

app.get('/items', (_req: Request, res: Response) => {
  res.json({
    serverTime: Date.now(),
    items: Array.from(items.values()),
  });
});

/* -------------------- REDIS SUBSCRIBER -------------------- */

await subscriber.subscribe('auction:events');

subscriber.on('message', (channel: string, message: string) => {
  if (channel !== 'auction:events') return;
  const event = JSON.parse(message) as { type: string; data: unknown };

  if (event.type === 'UPDATE_BID') {
    io.emit('UPDATE_BID', event.data);
  } else if (event.type === 'RESET_ITEMS') {
    io.emit('RESET_ITEMS', event.data);
  }
});

/* -------------------- SOCKET LOGIC -------------------- */

io.on('connection', (socket: Socket) => {
  const user = socket.data.user as AuthPayload;
  console.log(`User connected: ${socket.id} | role: ${user?.role}`);

  socket.on('BID_PLACED', async (data: { itemId: string; bidAmount: number }) => {
    if (user?.role !== 'bidder') {
      socket.emit('BID_ERROR', 'Only bidders can place bids');
      return;
    }

    const release = await mutex.acquire();
    try {
      const { itemId, bidAmount } = data;
      const item = items.get(itemId);

      if (!item) { socket.emit('BID_ERROR', 'Item not found'); return; }
      if (Date.now() > item.endTime) { socket.emit('BID_ERROR', 'Auction ended'); return; }
      if (bidAmount <= item.currentBid) { socket.emit('OUTBID'); return; }

      item.currentBid = bidAmount;
      item.highestBidder = user.sub;

      await pool.query(
        `INSERT INTO bids(auction_id, bidder_id, amount) VALUES($1,$2,$3)`,
        [itemId, user.sub, bidAmount]
      );

      console.log(`New bid on ${item.title}: ₹${bidAmount} by ${user.email}`);

      await publisher.publish('auction:events', JSON.stringify({
        type: 'UPDATE_BID',
        data: item,
      }));

    } catch (err) {
      console.error(err);
      socket.emit('BID_ERROR', 'Something went wrong');
    } finally {
      release();
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

/* -------------------- SERVER -------------------- */

const PORT = process.env.PORT ?? 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});