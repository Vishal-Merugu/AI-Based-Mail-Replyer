import IORedis from "ioredis";
import ENV from "../utils/validateEnv";
import mongoose from "mongoose";

const MONGO_URL = ENV.MONGO_URL;

mongoose.connect(MONGO_URL);

import startEmailWorker from "./emailWorker";

const connection = new IORedis({
  host: "127.0.0.1", // Redis server host
  port: 6379, // Redis server port
  maxRetriesPerRequest: null,
});

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("Mongo Connection Successful");
    startEmailWorker({ connection }).then(() => {
      console.log("CONSUMER STARTED");
    });
  })
  .catch((err) => {
    console.log(err);
  });
