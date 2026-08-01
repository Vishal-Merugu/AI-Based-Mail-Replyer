import { Request, Response } from "express";
import { z } from "zod";

import CategoryModel from "../models/category";
import RuleModel, { RULE_ACTIONS, RULE_MATCH_TYPES } from "../models/rule";
import { conflict, notFound } from "../errors/AppError";

const DUPLICATE_KEY = 11000;

// --- Categories ---

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(1000).default(""),
  replyTemplate: z.string().max(8000).default(""),
  dontReply: z.boolean().default(false),
});

export const updateCategorySchema = createCategorySchema.partial();

export const listCategories = async (req: Request, res: Response) => {
  const categories = await CategoryModel.find({ userId: req.user!.userId })
    .sort({ name: 1 })
    .lean();
  res.status(200).send(categories);
};

export const createCategory = async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof createCategorySchema>;
  try {
    const category = await CategoryModel.create({
      userId: req.user!.userId,
      ...body,
    });
    res.status(201).send(category);
  } catch (err: any) {
    // The unique (userId, name) index is what actually enforces this.
    if (err?.code === DUPLICATE_KEY) {
      throw conflict("A category with that name already exists");
    }
    throw err;
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof updateCategorySchema>;

  const category = await CategoryModel.findOneAndUpdate(
    { _id: req.params.categoryId, userId: req.user!.userId },
    body,
    { new: true }
  ).lean();

  if (!category) throw notFound("Category not found");
  res.status(200).send(category);
};

export const deleteCategory = async (req: Request, res: Response) => {
  const category = await CategoryModel.findOneAndDelete({
    _id: req.params.categoryId,
    userId: req.user!.userId,
  });
  if (!category) throw notFound("Category not found");
  res.status(200).send({ ok: true });
};

// --- Rules ---

export const createRuleSchema = z
  .object({
    matchType: z.enum(RULE_MATCH_TYPES),
    matchValue: z.string().trim().min(1).max(500),
    action: z.enum(RULE_ACTIONS),
    categoryName: z.string().trim().max(100).default(""),
    priority: z.coerce.number().int().min(-1000).max(1000).default(0),
  })
  .refine((v) => v.action !== "force-category" || v.categoryName.length > 0, {
    message: "categoryName is required when action is force-category",
    path: ["categoryName"],
  });

export const listRules = async (req: Request, res: Response) => {
  const rules = await RuleModel.find({ userId: req.user!.userId })
    .sort({ priority: -1, createdAt: 1 })
    .lean();
  res.status(200).send(rules);
};

export const createRule = async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof createRuleSchema>;
  const rule = await RuleModel.create({ userId: req.user!.userId, ...body });
  res.status(201).send(rule);
};

export const deleteRule = async (req: Request, res: Response) => {
  const rule = await RuleModel.findOneAndDelete({
    _id: req.params.ruleId,
    userId: req.user!.userId,
  });
  if (!rule) throw notFound("Rule not found");
  res.status(200).send({ ok: true });
};
