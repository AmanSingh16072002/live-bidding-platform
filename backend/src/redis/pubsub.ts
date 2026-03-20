import Redis from 'ioredis';

export const publisher = new Redis({
  host: 'localhost',
  port: 6380,
});

export const subscriber = new Redis({
  host: 'localhost',
  port: 6380,
});

publisher.on('error', (err: Error) => console.error('Redis publisher error:', err));
subscriber.on('error', (err: Error) => console.error('Redis subscriber error:', err));