# 🔨 Live Bidding Platform

A production-grade real-time auction platform built with Node.js, TypeScript, PostgreSQL, Redis, and Socket.io.

---

## 🚀 Live Demo

[live-bidding-platform-gamma.vercel.app](https://live-bidding-platform-gamma.vercel.app)

---

## 📊 Performance (k6 Load Test)

| Metric | Result |
|---|---|
| Concurrent bidders | 100 |
| Total requests | 6,766 |
| Throughput | 55.7 req/s |
| p95 latency | 4.86ms |
| HTTP failure rate | 0.00% |
| Race conditions | 0 (mutex validated) |

---

## 🏗️ Architecture
```
React Client
     │
     ├── HTTP ──▶ Express REST API (JWT Auth)
     │                  │
     │            PostgreSQL (users, auctions, bids)
     │
     └── WebSocket ──▶ Socket.io Server
                           │
                    Redis Pub/Sub (auction:events channel)
                           │
                    Bull Queue (auction expiry jobs)
                           │
                    Nodemailer (winner email notifications)
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express, TypeScript |
| Realtime | Socket.io |
| Database | PostgreSQL 16 |
| Cache / Pub-Sub | Redis 7 |
| Job Queue | BullMQ |
| Auth | JWT (seller / bidder roles) |
| Email | Nodemailer + Gmail SMTP |
| Concurrency | async-mutex |
| Load Testing | k6 |
| Containerization | Docker, Docker Compose |

---

## ✨ Features

- **JWT Authentication** — seller and bidder roles, token-based WebSocket auth
- **PostgreSQL persistence** — all users, auctions, and bids stored with UUID primary keys
- **Redis Pub/Sub** — horizontally scalable bid broadcasting across multiple server instances
- **Race condition safety** — mutex lock ensures only one bid processed at a time, validated under 100 concurrent users
- **Bull Queue** — background jobs fire exactly when each auction expires
- **Winner emails** — Nodemailer sends congratulation email to highest bidder on auction close
- **TypeScript** — strict mode, full type coverage across all backend modules
- **Load tested** — k6 test suite with 100 VUs, p95 latency 4.86ms, 0% failure rate

---

## 🗄️ Database Schema
```sql
CREATE TYPE user_role AS ENUM ('seller', 'bidder');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE auctions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  start_price NUMERIC(12,2) NOT NULL,
  current_bid NUMERIC(12,2),
  end_time    TIMESTAMPTZ NOT NULL,
  seller_id   UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bids (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id),
  bidder_id  UUID REFERENCES users(id),
  amount     NUMERIC(12,2) NOT NULL,
  placed_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 🚦 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/register | None | Register seller or bidder |
| POST | /auth/login | None | Login, returns JWT |
| GET | /items | None | Get all active auctions |

### WebSocket Events

| Event | Direction | Description |
|---|---|---|
| BID_PLACED | Client → Server | Place a bid (bidder role only) |
| UPDATE_BID | Server → Client | Broadcast new highest bid |
| RESET_ITEMS | Server → Client | Auction reset broadcast |
| BID_ERROR | Server → Client | Bid rejection reason |
| OUTBID | Server → Client | Bid too low |

---

## 🏃 Running Locally

**Prerequisites:** Docker Desktop, Node.js 18+
```bash
# Clone the repo
git clone https://github.com/AmanSingh16072002/live-bidding-platform.git
cd live-bidding-platform

# Start PostgreSQL and Redis
docker compose up -d

# Start backend
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev

# Start frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## 🧪 Load Testing
```bash
# Install k6: https://k6.io/docs/getting-started/installation
k6 run k6/load-test.js
```

---

## 📁 Project Structure
```
live-bidding-platform/
├── backend/
│   ├── src/
│   │   ├── auth/          # JWT auth router + service
│   │   ├── db/            # PostgreSQL pool + schema
│   │   ├── middleware/     # Token verification + role guards
│   │   ├── queues/        # BullMQ auction expiry worker
│   │   ├── redis/         # Pub/Sub publisher + subscriber
│   │   └── server.ts      # Main entry point
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   └── src/
├── k6/
│   └── load-test.js       # k6 performance test
├── docker-compose.yml
└── README.md
```

---

## 👨‍💻 Author

**Aman Singh** — NIT Uttarakhand, CS  
[GitHub](https://github.com/AmanSingh16072002)