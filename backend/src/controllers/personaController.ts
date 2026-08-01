import { Request, Response } from "express";

import MailMetaModel from "../models/mailMeta";
import { logger } from "../utils/logger";

const TONES = ["professional", "friendly", "concise", "enthusiastic", "formal"];

export const getPersona = async (req: Request, res: Response) => {
  try {
    const account = await MailMetaModel.findOne(
      { _id: req.params.accountId, userId: req.user!.userId },
      "emailID persona"
    ).lean();

    if (!account) {
      res.status(404).send({ message: "Account not found" });
      return;
    }

    res.status(200).send({ emailID: account.emailID, persona: account.persona });
  } catch (err: any) {
    logger.error({ err }, "Error in GET /accounts/:accountId/persona");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const updatePersona = async (req: Request, res: Response) => {
  try {
    const { name, tone, signature, extraInstructions } = req.body ?? {};

    if (tone && !TONES.includes(tone)) {
      res.status(400).send({
        message: `tone must be one of: ${TONES.join(", ")}`,
      });
      return;
    }

    const account = await MailMetaModel.findOneAndUpdate(
      { _id: req.params.accountId, userId: req.user!.userId },
      {
        persona: {
          name: name ?? "",
          tone: tone ?? "professional",
          signature: signature ?? "",
          extraInstructions: extraInstructions ?? "",
        },
      },
      { new: true }
    ).lean();

    if (!account) {
      res.status(404).send({ message: "Account not found" });
      return;
    }

    res.status(200).send({ persona: account.persona });
  } catch (err: any) {
    logger.error({ err }, "Error in PUT /accounts/:accountId/persona");
    res.status(500).send({ message: "Internal Server Error" });
  }
};
