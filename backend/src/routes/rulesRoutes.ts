import { Router } from "express";

import {
  createCategory,
  createRule,
  deleteCategory,
  deleteRule,
  listCategories,
  listRules,
  updateCategory,
} from "../controllers/rulesController";

const router = Router();

router.get("/categories", listCategories);
router.post("/categories", createCategory);
router.put("/categories/:categoryId", updateCategory);
router.delete("/categories/:categoryId", deleteCategory);

router.get("/rules", listRules);
router.post("/rules", createRule);
router.delete("/rules/:ruleId", deleteRule);

export default router;
