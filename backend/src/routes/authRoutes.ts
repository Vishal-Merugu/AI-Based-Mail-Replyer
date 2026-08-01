import { Router } from "express";

import {
  login,
  loginSchema,
  me,
  signup,
  signupSchema,
} from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { authLimiter } from "../middleware/rateLimit";

const router = Router();

router.post(
  "/auth/signup",
  authLimiter,
  validateBody(signupSchema),
  asyncHandler(signup)
);
router.post(
  "/auth/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(login)
);
router.get("/auth/me", requireAuth, asyncHandler(me));

export default router;
