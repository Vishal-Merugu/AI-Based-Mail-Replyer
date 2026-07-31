import "dotenv/config";
import mongoose from "mongoose";

import ENV from "../utils/validateEnv";
import { logger } from "../utils/logger";
import { redisConnection } from "../queue";
import startEmailWorker from "./emailWorker";

mongoose
  .connect(ENV.MONGO_URL)
  .then(() => {
    logger.info("Mongo connection successful");
    return startEmailWorker({ connection: redisConnection });
  })
  .then(() => {
    logger.info("Consumer started");
  })
  .catch((err) => {
    logger.error({ err }, "Failed to start email consumer");
  });
