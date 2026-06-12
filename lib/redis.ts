import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const redisUrl = process.env.REDIS_URL;

export const redis =
  globalForRedis.redis ??
  (redisUrl ? new Redis(redisUrl) : null);

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

export async function getCachedData<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number = 3600): Promise<T> {
  if (!redis) return fetchFn(); // Fallback to fetching directly if Redis is not configured

  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch (error) {
    console.warn("Redis get error:", error);
  }

  const data = await fetchFn();

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (error) {
    console.warn("Redis set error:", error);
  }

  return data;
}

export async function invalidateCache(key: string | string[]) {
  if (!redis) return;
  try {
    if (Array.isArray(key)) {
      if (key.length > 0) await redis.del(...key);
    } else {
      await redis.del(key);
    }
  } catch (error) {
    console.warn("Redis del error:", error);
  }
}
