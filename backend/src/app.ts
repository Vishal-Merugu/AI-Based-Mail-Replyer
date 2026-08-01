import express from "express";
import cors from "cors";
import { requestLogger } from "./utils/misc";
import emailRoutes from "./routes/emailRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import rulesRoutes from "./routes/rulesRoutes";
import authRoutes from "./routes/authRoutes";
import ENV from "./utils/validateEnv";
import { requireAuth } from "./middleware/requireAuth";

const app = express();

app.use(cors({ origin: ENV.CLIENT_URL }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Public — auth + Google OAuth callback + Pub/Sub push (the last two use
// their own auth mechanisms: signed OAuth `state` and payload origin).
app.use("/", authRoutes);
app.use("/", emailRoutes);

// Protected — dashboard requires an authenticated session.
app.use("/", requireAuth, dashboardRoutes);
app.use("/", requireAuth, rulesRoutes);

export default app;
