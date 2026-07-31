import { Router } from "express";
import { listAccounts, listActivity } from "../controllers/dashboardController";

const router = Router();

router.get("/accounts", listAccounts);
router.get("/activity", listActivity);

export default router;
