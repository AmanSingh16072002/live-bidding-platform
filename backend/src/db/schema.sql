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
  description TEXT,
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

CREATE INDEX idx_bids_auction_placed ON bids(auction_id, placed_at DESC);