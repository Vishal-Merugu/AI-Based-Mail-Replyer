import "dotenv/config";
import mongoose from "mongoose";

import ENV from "../utils/validateEnv";
import { logger } from "../utils/logger";
import { createWorkerConnection } from "../queue";
import startEmailWorker from "./emailWorker";
import startFollowUpWorker from "./followUpWorker";
import startDigestWorker from "./digestWorker";
import startWatchRenewalWorker from "./watchRenewalWorker";

mongoose
  .connect(ENV.MONGO_URL)
  .then(() => {
    logger.info("Mongo connection successful");

    // Each worker gets its own Redis connection: BullMQ workers block on
    // BRPOPLPUSH, and a blocked connection cannot serve the other queues.
    startEmailWorker({
      connection: createWorkerConnection(),
      concurrency: ENV.EMAIL_WORKER_CONCURRENCY,
    });
    startFollowUpWorker({ connection: createWorkerConnection() });
    startDigestWorker({ connection: createWorkerConnection() });
    startWatchRenewalWorker({ connection: createWorkerConnection() });

    logger.info(
      { emailConcurrency: ENV.EMAIL_WORKER_CONCURRENCY },
      "Consumers started (email + follow-up + digest + watch-renewal workers)",
    );
  })
  .catch((err) => {
    logger.error({ err }, "Failed to start consumers");
  });
