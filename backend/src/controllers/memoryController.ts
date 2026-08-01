import { Request, Response } from "express";

import ContactMemoryModel from "../models/contactMemory";
import { logger } from "../utils/logger";

export const listMemory = async (req: Request, res: Response) => {
  try {
    const rows = await ContactMemoryModel.find({ userId: req.user!.userId })
      .sort({ contactEmail: 1 })
      .lean();
    res.status(200).send(rows);
  } catch (err: any) {
    logger.error({ err }, "Error listing memory");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const upsertMemory = async (req: Request, res: Response) => {
  try {
    const { contactEmail, notes } = req.body ?? {};
    if (!contactEmail || typeof contactEmail !== "string") {
      res.status(400).send({ message: "contactEmail is required" });
      return;
    }
    const row = await ContactMemoryModel.findOneAndUpdate(
      { userId: req.user!.userId, contactEmail: contactEmail.toLowerCase().trim() },
      { notes: notes ?? "" },
      { upsert: true, new: true }
    ).lean();
    res.status(200).send(row);
  } catch (err: any) {
    logger.error({ err }, "Error saving memory");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const deleteMemory = async (req: Request, res: Response) => {
  try {
    const row = await ContactMemoryModel.findOneAndDelete({
      _id: req.params.memoryId,
      userId: req.user!.userId,
    });
    if (!row) {
      res.status(404).send({ message: "Memory not found" });
      return;
    }
    res.status(200).send({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "Error deleting memory");
    res.status(500).send({ message: "Internal Server Error" });
  }
};
