import { Request, Response } from "express";

import MailMetaModel from "../models/mailMeta";
import ProcessedEmailModel from "../models/processedEmail";
import { logger } from "../utils/logger";

export const listAccounts = async (_req: Request, res: Response) => {
  try {
    const accounts = await MailMetaModel.find(
      {},
      "emailID lastHistoryId createdAt updatedAt"
    ).lean();

    res.status(200).send(accounts);
  } catch (err: any) {
    logger.error({ err }, "Error in /accounts controller");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const listActivity = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const activity = await ProcessedEmailModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).send(activity);
  } catch (err: any) {
    logger.error({ err }, "Error in /activity controller");
    res.status(500).send({ message: "Internal Server Error" });
  }
};
