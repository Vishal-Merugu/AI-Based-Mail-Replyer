import { Router } from "express";

import {
  listAccounts,
  listActivity,
  listActivitySchema,
} from "../controllers/dashboardController";
import {
  getPersona,
  personaSchema,
  updatePersona,
} from "../controllers/personaController";
import {
  accountSettingsSchema,
  approveDraft,
  approveDraftSchema,
  listDrafts,
  rejectDraft,
  updateAccountSettings,
} from "../controllers/draftsController";
import {
  analyticsQuerySchema,
  getAnalytics,
} from "../controllers/analyticsController";
import {
  deleteMemory,
  listMemory,
  upsertMemory,
  upsertMemorySchema,
} from "../controllers/memoryController";
import {
  getNotifications,
  notificationsSchema,
  updateNotifications,
} from "../controllers/notificationsController";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody, validateQuery } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// requireAuth is attached PER ROUTE rather than via router.use(). Router-level
// middleware runs before route matching, so it would turn every unknown path
// into a 401 instead of letting it reach the 404 handler.

router.get("/accounts", requireAuth, asyncHandler(listAccounts));
router.get(
  "/accounts/:accountId/persona",
  requireAuth,
  asyncHandler(getPersona)
);
router.put(
  "/accounts/:accountId/persona",
  requireAuth,
  validateBody(personaSchema),
  asyncHandler(updatePersona)
);
router.put(
  "/accounts/:accountId/settings",
  requireAuth,
  validateBody(accountSettingsSchema),
  asyncHandler(updateAccountSettings)
);

router.get(
  "/activity",
  requireAuth,
  validateQuery(listActivitySchema),
  asyncHandler(listActivity)
);

router.get("/drafts", requireAuth, asyncHandler(listDrafts));
router.post(
  "/drafts/:draftId/approve",
  requireAuth,
  validateBody(approveDraftSchema),
  asyncHandler(approveDraft)
);
router.post("/drafts/:draftId/reject", requireAuth, asyncHandler(rejectDraft));

router.get(
  "/analytics",
  requireAuth,
  validateQuery(analyticsQuerySchema),
  asyncHandler(getAnalytics)
);

router.get("/memory", requireAuth, asyncHandler(listMemory));
router.post(
  "/memory",
  requireAuth,
  validateBody(upsertMemorySchema),
  asyncHandler(upsertMemory)
);
router.delete("/memory/:memoryId", requireAuth, asyncHandler(deleteMemory));

router.get("/notifications", requireAuth, asyncHandler(getNotifications));
router.put(
  "/notifications",
  requireAuth,
  validateBody(notificationsSchema),
  asyncHandler(updateNotifications)
);

export default router;
