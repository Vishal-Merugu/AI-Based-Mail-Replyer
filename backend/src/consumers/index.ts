import "dotenv/config";
import mongoose from "mongoose";

import ENV from "../utils/validateEnv";
import { logger } from "../utils/logger";
import { redisConnection } from "../queue";
import startEmailWorker from "./emailWorker";
import startFollowUpWorker from "./followUpWorker";

mongoose
  .connect(ENV.MONGO_URL)
  .then(() => {
    logger.info("Mongo connection successful");
    startEmailWorker({ connection: redisConnection });
    startFollowUpWorker({ connection: redisConnection });
    logger.info("Consumer started (email + follow-up workers)");
  })
  .catch((err) => {
    logger.error({ err }, "Failed to start consumers");
  });
