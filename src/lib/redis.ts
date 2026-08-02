import { Redis } from "ioredis";

let client: Redis | undefined;

export function getRedisConnection() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }
  return client;
}
