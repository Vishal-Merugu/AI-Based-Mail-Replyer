import { Router } from "express";
import { listAccounts, listActivity } from "../controllers/dashboardController";
import { getPersona, updatePersona } from "../controllers/personaController";

const router = Router();

router.get("/accounts", listAccounts);
router.get("/accounts/:accountId/persona", getPersona);
router.put("/accounts/:accountId/persona", updatePersona);
router.get("/activity", listActivity);

export default router;
