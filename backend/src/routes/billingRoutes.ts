import { Router } from "express";

import {
  createCheckoutSession,
  getBilling,
} from "../controllers/billingController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// requireAuth per route, not router.use(): router-level middleware runs
// before route matching and would make unknown paths 401 instead of 404.

router.get("/billing", requireAuth, asyncHandler(getBilling));
router.post(
  "/billing/checkout-session",
  requireAuth,
  asyncHandler(createCheckoutSession),
);

export default router;
