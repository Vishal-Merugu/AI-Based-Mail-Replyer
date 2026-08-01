import { Request, Response } from "express";

import PendingDraftModel from "../models/pendingDraft";
import MailMetaModel from "../models/mailMeta";
import ProcessedEmailModel from "../models/processedEmail";
import {
  createLabelOrGetExisting,
  modifyThreadAddLabel,
  sendReply,
} from "../consumers/gmailService";
import { logger } from "../utils/logger";

export const listDrafts = async (req: Request, res: Response) => {
  try {
    const drafts = await PendingDraftModel.find({
      userId: req.user!.userId,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.status(200).send(drafts);
  } catch (err: any) {
    logger.error({ err }, "Error in GET /drafts");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const approveDraft = async (req: Request, res: Response) => {
  try {
    const { draftBody, category } = req.body ?? {};

    const draft = await PendingDraftModel.findOne({
      _id: req.params.draftId,
      userId: req.user!.userId,
      status: "pending",
    });
    if (!draft) {
      res.status(404).send({ message: "Draft not found" });
      return;
    }

    const account = await MailMetaModel.findById(draft.accountId);
    if (!account || !account.access_token) {
      res.status(400).send({ message: "Sending account is no longer available" });
      return;
    }

    const finalBody = draftBody ?? draft.draftBody;
    const finalCategory = category ?? draft.category;

    const creds = {
      access_token: account.access_token,
      id_token: account.id_token ?? undefined,
      refresh_token: account.refresh_token ?? undefined,
    };

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
      category: finalCategory,
    });

    res.status(200).send({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "Error approving draft");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const rejectDraft = async (req: Request, res: Response) => {
  try {
    const draft = await PendingDraftModel.findOneAndUpdate(
      {
        _id: req.params.draftId,
        userId: req.user!.userId,
        status: "pending",
      },
      { status: "rejected" }
    );
    if (!draft) {
      res.status(404).send({ message: "Draft not found" });
      return;
    }
    res.status(200).send({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "Error rejecting draft");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const updateAccountSettings = async (req: Request, res: Response) => {
  try {
    const { autoSend, followUp } = req.body ?? {};
    const updates: any = {};

    if (autoSend !== undefined) {
      if (typeof autoSend !== "boolean") {
        res.status(400).send({ message: "autoSend must be a boolean" });
        return;
      }
      updates.autoSend = autoSend;
    }
    if (followUp !== undefined) {
      updates.followUp = {
        enabled: !!followUp.enabled,
        intervalDays: Math.max(
          1,
          Math.min(30, Number(followUp.intervalDays) || 3)
        ),
        maxAttempts: Math.max(
          1,
          Math.min(5, Number(followUp.maxAttempts) || 2)
        ),
      };
    }

    const account = await MailMetaModel.findOneAndUpdate(
      { _id: req.params.accountId, userId: req.user!.userId },
      updates,
      { new: true }
    ).lean();

    if (!account) {
      res.status(404).send({ message: "Account not found" });
      return;
    }

    res.status(200).send({
      autoSend: account.autoSend,
      followUp: account.followUp,
    });
  } catch (err: any) {
    logger.error({ err }, "Error updating account settings");
    res.status(500).send({ message: "Internal Server Error" });
  }
};
