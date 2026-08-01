import { Router } from "express";
import {
  getMessage,
  handleEmailAuth,
  handleRedirect,
} from "../controllers/emailController";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// Auth required: user is initiating a Gmail connection from the app.
router.get("/email/:emailId", requireAuth, handleEmailAuth);

// Public: Google redirects here — auth comes from the signed OAuth state param.
router.get("/redirect", handleRedirect);

// Public: Google Cloud Pub/Sub push endpoint — no user context available.
router.post("/getMessage", getMessage);

export default router;
