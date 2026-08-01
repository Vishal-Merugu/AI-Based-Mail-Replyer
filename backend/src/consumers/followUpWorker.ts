import { Worker, WorkerOptions } from "bullmq";

import { followUpQueue } from "../queue";
import FollowUpModel from "../models/followUp";
import MailMetaModel from "../models/mailMeta";
import { logger } from "../utils/logger";
import { tryConsumeReply } from "../services/quota";
import { sendReply } from "./gmailService";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function startFollowUpWorker(workerOptions: WorkerOptions) {
  const followUpWorker = new Worker(
    followUpQueue.name,
    async (job) => {
      const { followUpId } = job.data;

      // Atomically claim it. A plain findById + status check let a retried
      // job (send succeeded, status write failed) send the follow-up twice.
      const followUp = await FollowUpModel.findOneAndUpdate(
        { _id: followUpId, status: "pending" },
        { status: "sending" },
        { new: true }
      );
      if (!followUp) {
        logger.info(
          { followUpId },
          "Follow-up not pending (already sent, cancelled or in flight) — skipping"
        );
        return;
      }

      const account = await MailMetaModel.findById(followUp.accountId);
      if (!account || !account.access_token) {
        logger.warn({ followUpId }, "Account gone, cancelling follow-up");
        followUp.status = "cancelled";
        await followUp.save();
        return;
      }

      // Follow-ups previously bypassed billing entirely — they send real
      // mail and must draw from the same monthly allowance.
      const withinQuota = await tryConsumeReply(String(followUp.userId));
      if (!withinQuota) {
        logger.warn({ followUpId }, "Quota exceeded — cancelling follow-up");
        followUp.status = "cancelled";
        await followUp.save();
        return;
      }

      const creds = {
        access_token: account.access_token,
        id_token: account.id_token ?? undefined,
        refresh_token: account.refresh_token ?? undefined,
      };

      const body = `Hi,\n\nJust following up on my previous email — let me know if you're still interested or have any questions.\n\nThanks!`;

      await sendReply(
        {
          from: followUp.emailID,
          threadId: followUp.threadId,
          messageId: followUp.messageId || "",
          mailContent: body,
          to: followUp.to,
          subject: followUp.subject?.startsWith("Re:")
            ? followUp.subject
            : "Re: " + (followUp.subject || ""),
          // Follow-ups are unsolicited sends, so give the recipient a
          // standard way to opt out.
          unsubscribeMailto: followUp.emailID,
        },
        creds,
        followUp.emailID
      );

      followUp.status = "sent";
      await followUp.save();

      // Schedule the next attempt if we're not at the cap.
      if (followUp.attemptNumber < followUp.maxAttempts) {
        const next = await FollowUpModel.create({
          userId: followUp.userId,
          accountId: followUp.accountId,
          emailID: followUp.emailID,
          threadId: followUp.threadId,
          messageId: followUp.messageId,
          to: followUp.to,
          subject: followUp.subject,
          scheduledAt: new Date(Date.now() + followUp.intervalDays * DAY_MS),
          attemptNumber: followUp.attemptNumber + 1,
          maxAttempts: followUp.maxAttempts,
          intervalDays: followUp.intervalDays,
        });
        await followUpQueue.add(
          "sendFollowUp",
          { followUpId: next._id.toString() },
          { delay: followUp.intervalDays * DAY_MS }
        );
      }
    },
    workerOptions
  );

  followUpWorker.on("failed", (job, err) =>
    logger.error({ err, jobId: job?.id }, "Follow-up job failed")
  );

  return followUpWorker;
}
