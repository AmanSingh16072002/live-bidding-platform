import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6380';

export const publisher  = new Redis(redisUrl);
export const subscriber = new Redis(redisUrl);

publisher.on('error',  (err: Error) => console.error('Redis publisher error:', err));
subscriber.on('error', (err: Error) => console.error('Redis subscriber error:', err));