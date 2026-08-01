import { Router } from "express";

import { login, me, signup } from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.get("/auth/me", requireAuth, me);

export default router;
