import { Request, Response } from "express";

import CategoryModel from "../models/category";
import RuleModel, { RULE_ACTIONS, RULE_MATCH_TYPES } from "../models/rule";
import { logger } from "../utils/logger";

// --- Categories ---

export const listCategories = async (req: Request, res: Response) => {
  try {
    const categories = await CategoryModel.find({ userId: req.user!.userId })
      .sort({ name: 1 })
      .lean();
    res.status(200).send(categories);
  } catch (err: any) {
    logger.error({ err }, "Error listing categories");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, replyTemplate, dontReply } = req.body ?? {};
    if (!name || typeof name !== "string") {
      res.status(400).send({ message: "name is required" });
      return;
    }
    const category = await CategoryModel.create({
      userId: req.user!.userId,
      name: name.trim(),
      description: description ?? "",
      replyTemplate: replyTemplate ?? "",
      dontReply: !!dontReply,
    });
    res.status(201).send(category);
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).send({ message: "A category with that name already exists" });
      return;
    }
    logger.error({ err }, "Error creating category");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, replyTemplate, dontReply } = req.body ?? {};
    const category = await CategoryModel.findOneAndUpdate(
      { _id: req.params.categoryId, userId: req.user!.userId },
      {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(replyTemplate !== undefined ? { replyTemplate } : {}),
        ...(dontReply !== undefined ? { dontReply: !!dontReply } : {}),
      },
      { new: true }
    ).lean();
    if (!category) {
      res.status(404).send({ message: "Category not found" });
      return;
    }
    res.status(200).send(category);
  } catch (err: any) {
    logger.error({ err }, "Error updating category");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const category = await CategoryModel.findOneAndDelete({
      _id: req.params.categoryId,
      userId: req.user!.userId,
    });
    if (!category) {
      res.status(404).send({ message: "Category not found" });
      return;
    }
    res.status(200).send({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "Error deleting category");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

// --- Rules ---

export const listRules = async (req: Request, res: Response) => {
  try {
    const rules = await RuleModel.find({ userId: req.user!.userId })
      .sort({ priority: -1, createdAt: 1 })
      .lean();
    res.status(200).send(rules);
  } catch (err: any) {
    logger.error({ err }, "Error listing rules");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const createRule = async (req: Request, res: Response) => {
  try {
    const { matchType, matchValue, action, categoryName, priority } = req.body ?? {};

    if (!RULE_MATCH_TYPES.includes(matchType)) {
      res.status(400).send({
        message: `matchType must be one of: ${RULE_MATCH_TYPES.join(", ")}`,
      });
      return;
    }
    if (!RULE_ACTIONS.includes(action)) {
      res.status(400).send({
        message: `action must be one of: ${RULE_ACTIONS.join(", ")}`,
      });
      return;
    }
    if (!matchValue) {
      res.status(400).send({ message: "matchValue is required" });
      return;
    }
    if (action === "force-category" && !categoryName) {
      res.status(400).send({
        message: "categoryName is required when action is force-category",
      });
      return;
    }

    const rule = await RuleModel.create({
      userId: req.user!.userId,
      matchType,
      matchValue,
      action,
      categoryName: categoryName ?? "",
      priority: priority ?? 0,
    });
    res.status(201).send(rule);
  } catch (err: any) {
    logger.error({ err }, "Error creating rule");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const deleteRule = async (req: Request, res: Response) => {
  try {
    const rule = await RuleModel.findOneAndDelete({
      _id: req.params.ruleId,
      userId: req.user!.userId,
    });
    if (!rule) {
      res.status(404).send({ message: "Rule not found" });
      return;
    }
    res.status(200).send({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "Error deleting rule");
    res.status(500).send({ message: "Internal Server Error" });
  }
};
