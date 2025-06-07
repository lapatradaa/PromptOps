// lib/redis.ts

import Redis from 'ioredis';

let redis: Redis | null = null;

export const getRedisClient = () => {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL!);
    redis.on('error', (err) => console.error('[Redis] Client Error:', err));
  }
  return redis;
};

// Function to create a dedicated subscriber client for SSE purposes
export const createSubscriberClient = () => {
  const subscriber = new Redis(process.env.REDIS_URL!);
  subscriber.on('error', (err) => console.error('[Redis] Subscriber Error:', err));
  return subscriber;
};
