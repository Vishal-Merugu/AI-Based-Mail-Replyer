import { Router } from "express";
import { listAccounts, listActivity } from "../controllers/dashboardController";
import { getPersona, updatePersona } from "../controllers/personaController";
import {
  approveDraft,
  listDrafts,
  rejectDraft,
  updateAccountSettings,
} from "../controllers/draftsController";
import { getAnalytics } from "../controllers/analyticsController";

const router = Router();

router.get("/accounts", listAccounts);
router.get("/accounts/:accountId/persona", getPersona);
router.put("/accounts/:accountId/persona", updatePersona);
router.put("/accounts/:accountId/settings", updateAccountSettings);
router.get("/activity", listActivity);
router.get("/drafts", listDrafts);
router.post("/drafts/:draftId/approve", approveDraft);
router.post("/drafts/:draftId/reject", rejectDraft);
router.get("/analytics", getAnalytics);

export default router;
