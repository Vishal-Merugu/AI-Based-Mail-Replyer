import "dotenv/config";
import mongoose from "mongoose";

import ENV from "../utils/validateEnv";
import { redisConnection } from "../queue";
import startEmailWorker from "./emailWorker";

mongoose
  .connect(ENV.MONGO_URL)
  .then(() => {
    console.log("Mongo Connection Successful");
    return startEmailWorker({ connection: redisConnection });
  })
  .then(() => {
    console.log("CONSUMER STARTED");
  })
  .catch((err) => {
    console.log(err);
  });
