import "dotenv/config";
import app from "./app";
import ENV from "./utils/validateEnv";
import { logger } from "./utils/logger";
import mongoose from "mongoose";

const PORT = ENV.PORT;
const MONGO_URL = ENV.MONGO_URL;

mongoose
  .connect(MONGO_URL)
  .then(() => {
    logger.info("MongoDB connection successful");
    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to connect to MongoDB");
  });
