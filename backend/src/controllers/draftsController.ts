import { Request, Response } from "express";
import { z } from "zod";

import PendingDraftModel from "../models/pendingDraft";
import MailMetaModel from "../models/mailMeta";
import ProcessedEmailModel from "../models/processedEmail";
import {
  createLabelOrGetExisting,
  modifyThreadAddLabel,
  sendReply,
} from "../consumers/gmailService";
import { badRequest, notFound } from "../errors/AppError";
import { logger } from "../utils/logger";

export const approveDraftSchema = z.object({
  draftBody: z.string().max(20000).optional(),
  category: z.string().trim().max(100).optional(),
});

export const accountSettingsSchema = z.object({
  autoSend: z.boolean().optional(),
  followUp: z
    .object({
      enabled: z.boolean().default(false),
      intervalDays: z.coerce.number().int().min(1).max(30).default(3),
      maxAttempts: z.coerce.number().int().min(1).max(5).default(2),
    })
    .optional(),
});

export const listDrafts = async (req: Request, res: Response) => {
  const drafts = await PendingDraftModel.find({
    userId: req.user!.userId,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  res.status(200).send(drafts);
};

export const approveDraft = async (req: Request, res: Response) => {
  const { draftBody, category } = req.body as z.infer<
    typeof approveDraftSchema
  >;

  // Atomically claim the draft. A plain findOne let two concurrent
  // approvals both pass the status check and both dispatch the reply.
  const draft = await PendingDraftModel.findOneAndUpdate(
    {
      _id: req.params.draftId,
      userId: req.user!.userId,
      status: "pending",
    },
    { status: "sending" },
    { new: true }
  );
  if (!draft) throw notFound("Draft not found or already sent");

  const account = await MailMetaModel.findOne({
    _id: draft.accountId,
    userId: req.user!.userId,
  });
  if (!account || !account.access_token) {
    // Nothing was dispatched, so it is safe to un-claim and let the user
    // retry once the account is reconnected.
    draft.status = "pending";
    await draft.save();
    throw badRequest("Sending account is no longer available");
  }

  const finalBody = draftBody ?? draft.draftBody ?? "";
  // The worker always stamps a category, but the schema allows null — resolve
  // it explicitly rather than passing undefined into Gmail label creation.
  const finalCategory = category ?? draft.category ?? "Human Touch";

  const creds = {
    access_token: account.access_token,
    id_token: account.id_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
  };

  try {
    const labelId = await createLabelOrGetExisting(
      finalCategory,
      creds,
      draft.emailID
    );
    await modifyThreadAddLabel(draft.threadId!, labelId, creds, draft.emailID);
    await sendReply(
      {
        from: draft.to || "",
        threadId: draft.threadId || "",
        messageId: draft.messageId || "",
        mailContent: finalBody || "",
        to: draft.from || "",
        subject: draft.subject || "",
        quotedContext: draft.incomingSnippet || undefined,
      },
      creds,
      draft.emailID
    );
  } catch (err) {
    // Deliberately NOT reverting to "pending": the failure may have occurred
    // after Gmail accepted the message, and a re-approval would double-send.
    // The draft stays in "sending" for manual inspection.
    logger.error(
      { err, draftId: draft._id },
      "Draft dispatch failed; leaving draft in 'sending' to avoid a double-send"
    );
    throw err;
  }

  draft.status = "approved";
  draft.draftBody = finalBody;
  draft.category = finalCategory;
  await draft.save();

  await ProcessedEmailModel.create({
    userId: req.user!.userId,
    emailID: draft.emailID,
    threadId: draft.threadId,
    subject: draft.subject?.replace(/^Re:\s*/, ""),
    from: draft.from,
    fromAddress: draft.fromAddress,
    category: finalCategory,
  });

  res.status(200).send({ ok: true });
};

export const rejectDraft = async (req: Request, res: Response) => {
  const draft = await PendingDraftModel.findOneAndUpdate(
    {
      _id: req.params.draftId,
      userId: req.user!.userId,
      status: "pending",
    },
    { status: "rejected" }
  );
  if (!draft) throw notFound("Draft not found");
  res.status(200).send({ ok: true });
};

export const updateAccountSettings = async (req: Request, res: Response) => {
  const { autoSend, followUp } = req.body as z.infer<
    typeof accountSettingsSchema
  >;

  const updates: Record<string, unknown> = {};
  if (autoSend !== undefined) updates.autoSend = autoSend;
  if (followUp !== undefined) updates.followUp = followUp;

  if (Object.keys(updates).length === 0) {
    throw badRequest("Provide at least one of: autoSend, followUp");
  }

  const account = await MailMetaModel.findOneAndUpdate(
    { _id: req.params.accountId, userId: req.user!.userId },
    updates,
    { new: true }
  ).lean();

  if (!account) throw notFound("Account not found");

  res.status(200).send({
    autoSend: account.autoSend,
    followUp: account.followUp,
  });
};
