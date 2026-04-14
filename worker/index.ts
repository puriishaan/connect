import { Worker } from "bullmq";
import IORedis from "ioredis";
import { syncGmail } from "./jobs/syncGmail";
import { enrichContact } from "./jobs/enrichContact";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const syncWorker = new Worker("gmail-sync", syncGmail, { connection });
const enrichWorker = new Worker("contact-enrich", enrichContact, { connection });

syncWorker.on("completed", (job) => console.log(`Sync job ${job.id} completed`));
syncWorker.on("failed", (job, err) => console.error(`Sync job ${job?.id} failed:`, err));

enrichWorker.on("completed", (job) => console.log(`Enrich job ${job.id} completed`));
enrichWorker.on("failed", (job, err) => console.error(`Enrich job ${job?.id} failed:`, err));

console.log("Worker started — listening for jobs");
