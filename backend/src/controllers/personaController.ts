import { Request, Response } from "express";
import { z } from "zod";

import MailMetaModel from "../models/mailMeta";
import { notFound } from "../errors/AppError";

const TONES = [
  "professional",
  "friendly",
  "concise",
  "enthusiastic",
  "formal",
] as const;

export const personaSchema = z.object({
  name: z.string().trim().max(200).default(""),
  tone: z.enum(TONES).default("professional"),
  signature: z.string().max(2000).default(""),
  extraInstructions: z.string().max(4000).default(""),
});

export const getPersona = async (req: Request, res: Response) => {
  const account = await MailMetaModel.findOne(
    { _id: req.params.accountId, userId: req.user!.userId },
    "emailID persona"
  ).lean();

  if (!account) throw notFound("Account not found");

  res.status(200).send({ emailID: account.emailID, persona: account.persona });
};

export const updatePersona = async (req: Request, res: Response) => {
  const persona = req.body as z.infer<typeof personaSchema>;

  const account = await MailMetaModel.findOneAndUpdate(
    { _id: req.params.accountId, userId: req.user!.userId },
    { persona },
    { new: true }
  ).lean();

  if (!account) throw notFound("Account not found");

  res.status(200).send({ persona: account.persona });
};
