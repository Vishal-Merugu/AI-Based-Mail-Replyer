import express from "express";
import { logger } from "./utils/misc";
import emailRoutes from "./routes/emailRoutes";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

app.use("/", emailRoutes);

export default app;
