import { config as dotenv } from "dotenv";
import { resolve } from "node:path";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

dotenv({ path: resolve(process.cwd(), "../../.env") });
dotenv();

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const apiBase = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000/api/v1";
const workerSecret = process.env.WORKER_SECRET ?? "dev-worker-secret";

async function drainOutbox() {
  const res = await fetch(`${apiBase}/internal/outbox/process`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-worker-secret": workerSecret,
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`outbox drain failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return {
    ok: true,
    mode: "sandbox" as const,
    liveDelivery: false,
    ...body,
  };
}

async function main() {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queueName = "haramain-jobs";

  const queue = new Queue(queueName, { connection });
  await queue.add(
    "process-outbox",
    { reason: "bootstrap" },
    {
      repeat: { every: 15_000 },
      jobId: "process-outbox-repeat",
      removeOnComplete: 20,
      removeOnFail: 50,
    },
  );

  const worker = new Worker(
    queueName,
    async (job) => {
      if (job.name === "process-outbox") {
        const result = await drainOutbox();
        console.log("[worker] sandbox outbox drain", result);
        return result;
      }
      console.log(`[worker] processed ${job.name}`, { mode: "sandbox", id: job.id });
      return { ok: true, mode: "sandbox", liveDelivery: false };
    },
    { connection },
  );

  worker.on("ready", () => {
    console.log(`Worker ready on ${queueName} (sandbox outbox drain, no live channels)`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
