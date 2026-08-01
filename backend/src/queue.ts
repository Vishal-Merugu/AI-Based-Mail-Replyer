import { DefaultJobOptions, Queue } from "bullmq";
import IORedis from "ioredis";

import ENV from "./utils/validateEnv";

function createRedisConnection(): IORedis {
  return new IORedis({
    host: ENV.REDIS_HOST,
    port: ENV.REDIS_PORT,
    ...(ENV.REDIS_PASSWORD ? { password: ENV.REDIS_PASSWORD } : {}),
    ...(ENV.REDIS_TLS ? { tls: {} } : {}),
    // Required by BullMQ for connections used by blocking commands.
    maxRetriesPerRequest: null,
  });
}

// Queues (non-blocking) share one connection. Workers issue blocking commands
// and must NOT share it — see createWorkerConnection below.
export const redisConnection = createRedisConnection();

/**
 * Each Worker needs its own connection: BullMQ workers block on BRPOPLPUSH,
 * and a blocked connection cannot service other queues' commands.
 */
export function createWorkerConnection(): IORedis {
  return createRedisConnection();
}

/**
 * Without retries a transient Gmail/Groq blip permanently drops the job.
 * Without removeOn* every completed job stays in Redis forever, so memory
 * grows without bound.
 */
const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  // Keep failures longer — they are the ones worth inspecting.
  removeOnFail: { age: 7 * 24 * 3600, count: 5000 },
};

export const emailQueue = new Queue("emailQueue", {
  connection: redisConnection,
  defaultJobOptions,
});

export const followUpQueue = new Queue("followUpQueue", {
  connection: redisConnection,
  defaultJobOptions,
});

export const digestQueue = new Queue("digestQueue", {
  connection: redisConnection,
  defaultJobOptions,
});

export const watchQueue = new Queue("watchQueue", {
  connection: redisConnection,
  defaultJobOptions,
});
