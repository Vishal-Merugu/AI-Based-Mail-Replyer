import { Queue } from "bullmq";
import IORedis from "ioredis";

import ENV from "./utils/validateEnv";

export const redisConnection = new IORedis({
  host: ENV.REDIS_HOST,
  port: ENV.REDIS_PORT,
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue("emailQueue", {
  connection: redisConnection,
});

export const followUpQueue = new Queue("followUpQueue", {
  connection: redisConnection,
});

export const digestQueue = new Queue("digestQueue", {
  connection: redisConnection,
});

export const watchQueue = new Queue("watchQueue", {
  connection: redisConnection,
});
