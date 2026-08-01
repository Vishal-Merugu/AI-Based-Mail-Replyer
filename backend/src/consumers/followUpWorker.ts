import { QueueBaseOptions, Worker } from "bullmq";

import { followUpQueue } from "../queue";
import FollowUpModel from "../models/followUp";
import MailMetaModel from "../models/mailMeta";
import { logger } from "../utils/logger";
import { sendReply } from "./gmailService";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function startFollowUpWorker(workerOptions?: QueueBaseOptions) {
  const followUpWorker = new Worker(
    followUpQueue.name,
    async (job) => {
      const { followUpId } = job.data;
      const followUp = await FollowUpModel.findById(followUpId);
      if (!followUp || followUp.status !== "pending") {
        logger.info({ followUpId }, "Follow-up no longer pending, skipping");
        return;
      }

      const account = await MailMetaModel.findById(followUp.accountId);
      if (!account || !account.access_token) {
        logger.warn({ followUpId }, "Account gone, cancelling follow-up");
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
