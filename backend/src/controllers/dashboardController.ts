import { Request, Response } from "express";
import { z } from "zod";

import MailMetaModel from "../models/mailMeta";
import ProcessedEmailModel from "../models/processedEmail";

export const listActivitySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listAccounts = async (req: Request, res: Response) => {
  const accounts = await MailMetaModel.find(
    { userId: req.user!.userId },
    "emailID lastHistoryId autoSend followUp watchExpiration createdAt updatedAt"
  ).lean();

  res.status(200).send(accounts);
};

export const listActivity = async (req: Request, res: Response) => {
  const { limit } = req.query as unknown as z.infer<typeof listActivitySchema>;

  const activity = await ProcessedEmailModel.find({ userId: req.user!.userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.status(200).send(activity);
};
