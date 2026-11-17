import { config as dotenv } from "dotenv";
import { resolve } from "node:path";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

dotenv({ path: resolve(process.cwd(), "../../.env") });
dotenv();

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

async function main() {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queueName = "haramain-jobs";

  // Ensure queue exists for local diagnostics
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const queue = new Queue(queueName, { connection });

  const worker = new Worker(
    queueName,
    async (job) => {
      // Sandbox-safe workers only — no live SMS/payment side effects
      console.log(`[worker] processed ${job.name}`, { mode: "sandbox", id: job.id });
      return { ok: true, mode: "sandbox" };
    },
    { connection },
  );

  worker.on("ready", () => {
    console.log(`Worker ready on ${queueName} (sandbox mode)`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
