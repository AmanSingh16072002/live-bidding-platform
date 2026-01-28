# 🔥 Live Bidding Platform

A real-time auction platform built with Node.js, Socket.io, and React.

This project demonstrates real-time synchronization, race condition handling,
and server-synced countdown timers.

---

## 🚀 Features

- Real-time bidding using Socket.io
- Race-condition safe bid handling (Mutex Lock)
- Live countdown synced with server time
- Winning / Outbid indicators
- Visual bid animations
- Dockerized setup

---

## 🏗️ Tech Stack

- Backend: Node.js, Express, Socket.io
- Frontend: React (Vite)
- Concurrency: async-mutex
- Deployment: Docker

---

## ⚙️ Architecture


All bids are processed atomically using a mutex lock
to avoid race conditions.

---

## 🧠 Race Condition Handling

Bids are processed inside a mutex lock:

- Only one bid is validated at a time
- Prevents simultaneous acceptance
- Ensures fairness

---

## ⏱️ Timer Synchronization

Client timers are synced using server timestamps.
This prevents client-side manipulation.

---

## 🐳 Docker Setup

Run locally using:

```bash
docker-compose up --build
