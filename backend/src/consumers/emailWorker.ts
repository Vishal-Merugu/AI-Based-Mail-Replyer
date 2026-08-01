import { Worker, WorkerOptions } from "bullmq";

import { emailQueue, followUpQueue } from "../queue";
import {
  createLabelOrGetExisting,
  extractAttachmentText,
  fetchEmails,
  findOneAndUpdateMailModel,
  getMailMetaModel,
  getThreadMessages,
  modifyThreadAddLabel,
  sendReply,
} from "./gmailService";
import GroqChatHandler, { DEFAULT_CATEGORIES } from "../services/groqService";
import ProcessedEmailModel from "../models/processedEmail";
import PendingDraftModel from "../models/pendingDraft";
import CategoryModel from "../models/category";
import RuleModel from "../models/rule";
import FollowUpModel from "../models/followUp";
import ContactMemoryModel from "../models/contactMemory";
import { evaluateRules } from "../services/ruleEngine";
import { extractAddress, suppressionReason } from "../services/autoReplyPolicy";
import {
  notifyInterestedReply,
  notifyJobFailure,
} from "../services/notifications";
import { tryConsumeReply } from "../services/quota";
import {
  claimMessage,
  completeMessageClaim,
  releaseMessageClaim,
} from "../services/messageClaims";
import {
  MailboxBusyError,
  acquireMailboxLock,
  releaseMailboxLock,
} from "../utils/mailboxLock";
import { logger } from "../utils/logger";
import Bluebird from "bluebird";

const LOOP_WINDOW_MS = 60 * 60 * 1000;
const MAX_REPLIES_PER_CONTACT_PER_WINDOW = 3;

export default function startEmailWorker(workerOptions: WorkerOptions) {
  const emailWorker = new Worker(
    emailQueue.name,
    async (job) => {
      logger.info(`Processing email job: ${job.id}`);
      const { emailAddress, historyId } = job?.data;

      // Only one job may process a given mailbox at a time. Without this,
      // concurrent jobs read the same lastHistoryId and send duplicate
      // replies. Throwing lets BullMQ retry with backoff once the holder
      // finishes, so nothing is dropped.
      const lockToken = await acquireMailboxLock(emailAddress);
      if (!lockToken) {
        logger.info({ emailAddress }, "Mailbox busy — deferring job");
        throw new MailboxBusyError(emailAddress);
      }

      try {
        await processMailbox(emailAddress, historyId);
      } finally {
        await releaseMailboxLock(emailAddress, lockToken);
      }
    },
    workerOptions,
  );

  emailWorker.on("completed", (job) =>
    logger.info(`Email job ${job.id} completed.`),
  );
  emailWorker.on("failed", (job, err) => {
    // Mailbox contention is expected backpressure, not a fault.
    if (err?.name === "MailboxBusyError") return;
    logger.error({ err, jobId: job?.id }, "Email job failed");
  });

  return emailWorker;
}

async function processMailbox(emailAddress: string, historyId: string) {
  const mailMetaDoc = await getMailMetaModel({
    emailID: emailAddress,
  });

  if (!mailMetaDoc || !mailMetaDoc.access_token)
    throw Error("MAIL with acces token was not registered");

  const {
    _id: accountId,
    access_token,
    id_token,
    refresh_token,
    lastHistoryId,
    userId,
    persona,
    autoSend,
    followUp: followUpCfg,
  } = mailMetaDoc as any;

  const { messages: mailObjects, newHistoryId } = await fetchEmails(
    emailAddress,
    {
      lastHistoryId: lastHistoryId ?? historyId,
      access_token,
      id_token,
      refresh_token,
    },
  );

  const Groq = new GroqChatHandler();

  const [customCategories, userRules] = await Promise.all([
    CategoryModel.find({ userId }).lean(),
    RuleModel.find({ userId }).lean(),
  ]);
  const categoriesByName = new Map(customCategories.map((c) => [c.name, c]));

  await Bluebird.mapSeries(mailObjects, async (mailObj) => {
    // Refuse to auto-reply to bulk mail, mailing lists, bounces and other
    // auto-responders (RFC 3834). Without this two responders loop
    // forever, which burns quota and gets the domain blacklisted.
    const suppressed = suppressionReason(mailObj, emailAddress);
    if (suppressed) {
      logger.info(
        { from: mailObj.From, reason: suppressed },
        "Auto-reply suppressed",
      );
      return;
    }

    // Backstop for peers that set none of the standard headers: cap how
    // often we will reply to the same contact. A novel loop still
    // terminates instead of running until quota is exhausted.
    const fromAddress = extractAddress(mailObj.From);
    const recentReplies = await ProcessedEmailModel.countDocuments({
      userId,
      emailID: emailAddress,
      fromAddress,
      createdAt: { $gte: new Date(Date.now() - LOOP_WINDOW_MS) },
    });
    if (recentReplies >= MAX_REPLIES_PER_CONTACT_PER_WINDOW) {
      logger.warn(
        { from: fromAddress, recentReplies },
        "Auto-reply suppressed: per-contact rate cap (possible mail loop)",
      );
      return;
    }

    // A new inbound message on an existing thread means the recipient
    // replied — cancel any pending follow-ups for that thread.
    if (mailObj.threadId) {
      await FollowUpModel.updateMany(
        {
          accountId,
          threadId: mailObj.threadId,
          status: "pending",
        },
        { status: "cancelled" },
      );
    }

    // Tracked so `finally` can settle the claim on every exit path — the
    // block below has four separate `return`s plus the throw path.
    let claimed = false;
    let failed = false;

    try {
      const ruleMatch = evaluateRules(userRules as any, {
        From: mailObj.From,
        Subject: mailObj.Subject,
      });

      if (ruleMatch?.action === "skip-reply") {
        logger.info(
          { from: mailObj.From, threadId: mailObj.threadId },
          "Rule matched: skipping reply",
        );
        return;
      }

      // Idempotency gate. Pub/Sub is at-least-once and BullMQ retries failed
      // jobs, so without this a job that dies after sending re-sends the same
      // reply. Claim before any spend (LLM) or irreversible action (send).
      claimed = await claimMessage(String(userId), mailObj.gmailMessageId);
      if (!claimed) {
        logger.info(
          { gmailMessageId: mailObj.gmailMessageId, from: mailObj.From },
          "Message already handled — skipping duplicate delivery",
        );
        return;
      }

      // Enforce monthly quota — atomic increment, safe under concurrency.
      const allowed = await tryConsumeReply(String(userId));
      if (!allowed) {
        logger.warn(
          { userId, threadId: mailObj.threadId },
          "Quota exceeded — skipping reply",
        );
        return;
      }

      let parsedResponse: { category: string; responseMail: string };

      if (ruleMatch?.action === "force-category" && ruleMatch.categoryName) {
        const cat = categoriesByName.get(ruleMatch.categoryName);
        parsedResponse = {
          category: ruleMatch.categoryName,
          responseMail:
            cat?.replyTemplate ||
            "Thanks for your email — we'll get back to you shortly.",
        };
      } else {
        const creds = {
          access_token,
          id_token,
          refresh_token,
        };

        const [threadHistory, contactMemory, attachmentText] =
          await Promise.all([
            mailObj.threadId
              ? getThreadMessages(mailObj.threadId, creds, emailAddress)
              : Promise.resolve([]),
            (async () => {
              const addr = mailObj.From.match(/<([^>]+)>/)?.[1] || mailObj.From;
              return ContactMemoryModel.findOne({
                userId,
                contactEmail: addr.toLowerCase().trim(),
              }).lean();
            })(),
            mailObj.gmailMessageId
              ? extractAttachmentText(
                  mailObj.gmailMessageId,
                  creds,
                  emailAddress,
                )
              : Promise.resolve(""),
          ]);

        const contentForAI = attachmentText
          ? `${mailObj.mailContent}\n\n[Attached PDF content]\n${attachmentText}`
          : mailObj.mailContent;

        const allowedCategories = customCategories.length
          ? customCategories.map((c) => ({
              name: c.name,
              description: c.description ?? "",
            }))
          : DEFAULT_CATEGORIES;

        const AIResponse = await Groq.analyzeEmailContent(contentForAI, {
          persona,
          categories: allowedCategories,
          threadHistory,
          contactNotes: contactMemory?.notes,
        });
        // Validated against the allowed set — an injected model cannot
        // emit an arbitrary category (which becomes a Gmail label).
        parsedResponse = Groq.getCategoryNResponseMail(
          AIResponse,
          allowedCategories,
        );

        // If AI picked a user-defined category that has dontReply or a
        // hardcoded template, honor those.
        const cat = categoriesByName.get(parsedResponse.category);
        if (cat?.dontReply) {
          await ProcessedEmailModel.create({
            userId,
            emailID: emailAddress,
            threadId: mailObj.threadId,
            subject: mailObj.Subject,
            from: mailObj.From,
            fromAddress,
            category: parsedResponse.category,
          });
          return;
        }
        if (cat?.replyTemplate) {
          parsedResponse.responseMail = cat.replyTemplate;
        }
      }

      // Review-mode: park the draft in the outbox instead of sending.
      if (autoSend === false) {
        await PendingDraftModel.create({
          userId,
          accountId,
          emailID: emailAddress,
          threadId: mailObj.threadId,
          messageId: mailObj["Message-Id"],
          from: mailObj.From,
          fromAddress,
          to: mailObj.To,
          subject: "Re: " + mailObj.Subject,
          incomingSnippet: mailObj.mailContent,
          draftBody: parsedResponse.responseMail,
          category: parsedResponse.category,
          status: "pending",
        });
        return;
      }

      const creds = {
        access_token,
        id_token,
        refresh_token,
      };

      const labelId = await createLabelOrGetExisting(
        parsedResponse.category,
        creds,
        emailAddress,
      );

      await modifyThreadAddLabel(
        mailObj.threadId,
        labelId,
        creds,
        emailAddress,
      );

      await sendReply(
        {
          from: mailObj.To,
          threadId: mailObj.threadId,
          messageId: mailObj["Message-Id"],
          mailContent: parsedResponse.responseMail,
          to: mailObj.From, //from becomes to as we giving response mail to sender
          subject: "Re: " + mailObj.Subject,
          quotedContext: mailObj.mailContent,
        },
        creds,
        emailAddress,
      );

      await ProcessedEmailModel.create({
        userId,
        emailID: emailAddress,
        threadId: mailObj.threadId,
        subject: mailObj.Subject,
        from: mailObj.From,
        fromAddress,
        category: parsedResponse.category,
      });

      if (parsedResponse.category === "Interested") {
        notifyInterestedReply(
          String(userId),
          emailAddress,
          mailObj.From,
          mailObj.Subject,
        ).catch(() => undefined);
      }

      if (
        followUpCfg?.enabled &&
        parsedResponse.category === "Interested" &&
        mailObj.threadId
      ) {
        const intervalDays = followUpCfg.intervalDays ?? 3;
        const maxAttempts = followUpCfg.maxAttempts ?? 2;
        const scheduledAt = new Date(
          Date.now() + intervalDays * 24 * 60 * 60 * 1000,
        );
        const doc = await FollowUpModel.create({
          userId,
          accountId,
          emailID: emailAddress,
          threadId: mailObj.threadId,
          messageId: mailObj["Message-Id"],
          to: mailObj.From,
          subject: mailObj.Subject,
          scheduledAt,
          attemptNumber: 1,
          maxAttempts,
          intervalDays,
        });
        await followUpQueue.add(
          "sendFollowUp",
          { followUpId: doc._id.toString() },
          { delay: intervalDays * 24 * 60 * 60 * 1000 },
        );
      }
    } catch (err: any) {
      failed = true;
      // Isolate failures per-message so one bad thread doesn't fail
      // the whole job and cause already-replied messages to be redone.
      logger.error(
        { err, threadId: mailObj.threadId },
        "Failed to process message",
      );
      notifyJobFailure(
        String(userId),
        emailAddress,
        err?.message || String(err),
      ).catch(() => undefined);
    } finally {
      // Runs on every exit above, including the early returns.
      if (claimed) {
        if (failed) {
          // Hand the message back so a retry can legitimately redo it.
          await releaseMessageClaim(
            String(userId),
            mailObj.gmailMessageId,
          ).catch((e) =>
            logger.error({ err: e }, "Failed to release message claim"),
          );
        } else {
          // Decided (replied, drafted, suppressed or over quota) — never
          // process this message again.
          await completeMessageClaim(
            String(userId),
            mailObj.gmailMessageId,
          ).catch((e) =>
            logger.error({ err: e }, "Failed to complete message claim"),
          );
        }
      }
    }
  });

  // Advance the history cursor only after the whole batch has been
  // processed. Doing it up-front (as before) meant a crash mid-batch
  // skipped those emails permanently. If the job throws before this
  // point the cursor stays put and BullMQ retries the batch.
  if (newHistoryId) {
    await findOneAndUpdateMailModel(
      { emailID: emailAddress },
      { lastHistoryId: newHistoryId },
    );
  }
}
