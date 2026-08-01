import { Router } from "express";
import {
  createCheckoutSession,
  getBilling,
} from "../controllers/billingController";

const router = Router();

router.get("/billing", getBilling);
router.post("/billing/checkout-session", createCheckoutSession);

export default router;
