import { Request, Response } from "express";

import MailMetaModel from "../models/mailMeta";
import ProcessedEmailModel from "../models/processedEmail";

export const listAccounts = async (_req: Request, res: Response) => {
  try {
    const accounts = await MailMetaModel.find(
      {},
      "emailID lastHistoryId createdAt updatedAt"
    ).lean();

    res.status(200).send(accounts);
  } catch (err: any) {
    console.error("ERROR IN /accounts controller", err.toString());
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
    console.error("ERROR IN /activity controller", err.toString());
    res.status(500).send({ message: "Internal Server Error" });
  }
};
