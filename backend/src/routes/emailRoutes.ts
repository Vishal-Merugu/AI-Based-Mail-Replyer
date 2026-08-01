import { Router } from "express";
import {
  getMessage,
  handleEmailAuth,
  handleRedirect,
} from "../controllers/emailController";
import { requireAuth } from "../middleware/requireAuth";
import { verifyPubSubPush } from "../middleware/verifyPubSubPush";

const router = Router();

// Auth required: user is initiating a Gmail connection from the app.
router.get("/email/:emailId", requireAuth, handleEmailAuth);

// Public: Google redirects here — auth comes from the signed OAuth state param.
router.get("/redirect", handleRedirect);

// Pub/Sub push: no user session, authenticated by Google's OIDC token
// (or a shared secret) rather than by a user JWT.
router.post("/getMessage", verifyPubSubPush, getMessage);

export default router;
