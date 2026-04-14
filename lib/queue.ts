import { Queue } from "bullmq";
import IORedis from "ioredis";

export const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const syncQueue = new Queue("gmail-sync", { connection: redisConnection });
export const enrichQueue = new Queue("contact-enrich", { connection: redisConnection });
