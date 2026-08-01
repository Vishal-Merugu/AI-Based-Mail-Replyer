import { Router } from "express";

import {
  createCategory,
  createCategorySchema,
  createRule,
  createRuleSchema,
  deleteCategory,
  deleteRule,
  listCategories,
  listRules,
  updateCategory,
  updateCategorySchema,
} from "../controllers/rulesController";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// requireAuth per route, not router.use(): router-level middleware runs
// before route matching and would make unknown paths 401 instead of 404.

router.get("/categories", requireAuth, asyncHandler(listCategories));
router.post(
  "/categories",
  requireAuth,
  validateBody(createCategorySchema),
  asyncHandler(createCategory),
);
router.put(
  "/categories/:categoryId",
  requireAuth,
  validateBody(updateCategorySchema),
  asyncHandler(updateCategory),
);
router.delete(
  "/categories/:categoryId",
  requireAuth,
  asyncHandler(deleteCategory),
);

router.get("/rules", requireAuth, asyncHandler(listRules));
router.post(
  "/rules",
  requireAuth,
  validateBody(createRuleSchema),
  asyncHandler(createRule),
);
router.delete("/rules/:ruleId", requireAuth, asyncHandler(deleteRule));

export default router;
