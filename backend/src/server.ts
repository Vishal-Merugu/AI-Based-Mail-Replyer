import app from "./app";
import ENV from "./utils/validateEnv";
import mongoose from "mongoose";

const PORT = ENV.PORT;
const MONGO_URL = ENV.MONGO_URL;

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("MongoDB Connection Successful");
    app.listen(PORT, () => {
      console.log("SERVER STARTED ON PORT", PORT);
    });
  })
  .catch((err) => {
    console.error("Error:", err);
  });
