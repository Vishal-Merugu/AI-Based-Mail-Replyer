import { Request, Response } from "express";
import { z } from "zod";

import ContactMemoryModel from "../models/contactMemory";
import { notFound } from "../errors/AppError";

export const upsertMemorySchema = z.object({
  contactEmail: z
    .string()
    .email()
    .transform((s) => s.toLowerCase().trim()),
  notes: z.string().max(8000).default(""),
});

export const listMemory = async (req: Request, res: Response) => {
  const rows = await ContactMemoryModel.find({ userId: req.user!.userId })
    .sort({ contactEmail: 1 })
    .lean();
  res.status(200).send(rows);
};

export const upsertMemory = async (req: Request, res: Response) => {
  const { contactEmail, notes } = req.body as z.infer<
    typeof upsertMemorySchema
  >;

  const row = await ContactMemoryModel.findOneAndUpdate(
    { userId: req.user!.userId, contactEmail },
    { notes },
    { upsert: true, new: true }
  ).lean();

  res.status(200).send(row);
};

export const deleteMemory = async (req: Request, res: Response) => {
  const row = await ContactMemoryModel.findOneAndDelete({
    _id: req.params.memoryId,
    userId: req.user!.userId,
  });
  if (!row) throw notFound("Memory not found");
  res.status(200).send({ ok: true });
};
