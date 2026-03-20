import { Queue, Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { pool } from '../db/pool.js';

const connection = {
  host: 'localhost',
  port: 6380,
};

// Queue
export const auctionQueue = new Queue('auction-expiry', { connection });

// Email transporter (using Gmail or any SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Worker — processes jobs when auction expires
export const auctionWorker = new Worker(
  'auction-expiry',
  async (job) => {
    const { auctionId, auctionTitle } = job.data;

    console.log(`Processing expiry for auction: ${auctionTitle}`);

    // Find the highest bid for this auction
    const { rows } = await pool.query(
      `SELECT b.amount, b.bidder_id, u.email
       FROM bids b
       JOIN users u ON u.id = b.bidder_id
       WHERE b.auction_id = $1
       ORDER BY b.amount DESC
       LIMIT 1`,
      [auctionId]
    );

    if (rows.length === 0) {
      console.log(`No bids for auction ${auctionTitle} — no winner`);
      return;
    }

    const winner = rows[0];
    console.log(`Winner: ${winner.email} with ₹${winner.amount}`);

    // Send winner email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: winner.email,
      subject: `🎉 You won: ${auctionTitle}!`,
      html: `
        <h2>Congratulations!</h2>
        <p>You won the auction for <strong>${auctionTitle}</strong></p>
        <p>Your winning bid: <strong>₹${winner.amount}</strong></p>
        <p>Our team will contact you shortly.</p>
      `,
    });

    console.log(`Winner email sent to ${winner.email}`);
  },
  { connection }
);

auctionWorker.on('completed', (job) => {
  console.log(`Auction expiry job ${job.id} completed`);
});

auctionWorker.on('failed', (job, err) => {
  console.error(`Auction expiry job ${job.id} failed:`, err.message);
});