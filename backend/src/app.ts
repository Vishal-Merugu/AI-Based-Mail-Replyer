import express from "express";
import cors from "cors";
import { logger } from "./utils/misc";
import emailRoutes from "./routes/emailRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import ENV from "./utils/validateEnv";

const app = express();

app.use(cors({ origin: ENV.CLIENT_URL }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

app.use("/", emailRoutes);
app.use("/", dashboardRoutes);

export default app;
