import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";

import { requestLogger } from "./utils/misc";
import emailRoutes from "./routes/emailRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import rulesRoutes from "./routes/rulesRoutes";
import authRoutes from "./routes/authRoutes";
import billingRoutes from "./routes/billingRoutes";
import { handleStripeWebhook } from "./controllers/billingController";
import ENV from "./utils/validateEnv";
import { apiLimiter } from "./middleware/rateLimit";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

// Trust the proxy so rate limiting keys on the real client IP rather than
// the load balancer's.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: ENV.CLIENT_URL }));

// Liveness/readiness. Deliberately before auth and rate limiting so probes
// are never throttled or rejected.
app.get("/health", (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).send({
    status: dbUp ? "ok" : "degraded",
    db: dbUp ? "up" : "down",
    uptime: process.uptime(),
  });
});

// Stripe webhook MUST see the raw body for signature verification. Mount it
// with express.raw() BEFORE the JSON body parser, and outside of auth.
app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(requestLogger);

// Public — auth + Google OAuth callback + Pub/Sub push (the last two use
// their own auth mechanisms: signed OAuth `state` and Google's OIDC token).
app.use("/", authRoutes);
app.use("/", emailRoutes);

// Protected routers apply requireAuth to their OWN routes (see each router).
// Applying it here at "/" would run auth before route matching, so every
// unknown path returned 401 instead of reaching the 404 handler.
app.use("/", apiLimiter, dashboardRoutes);
app.use("/", apiLimiter, rulesRoutes);
app.use("/", apiLimiter, billingRoutes);

// Must come last, and in this order.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
