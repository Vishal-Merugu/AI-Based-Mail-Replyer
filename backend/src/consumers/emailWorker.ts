import { QueueBaseOptions, Worker } from "bullmq";

import { emailQueue } from "../queue";
import {
  createLabelOrGetExisting,
  fetchEmails,
  getMailMetaModel,
  modifyThreadAddLabel,
  sendReply,
} from "./gmailService";
import GroqChatHandler from "../services/groqService";
import ProcessedEmailModel from "../models/processedEmail";
import PendingDraftModel from "../models/pendingDraft";
import { logger } from "../utils/logger";
import Bluebird from "bluebird";

export default function startEmailWorker(workerOptions?: QueueBaseOptions) {
  const emailWorker = new Worker(
    emailQueue.name,
    async (job) => {
      logger.info(`Processing email job: ${job.id}`);
      const { emailAddress, historyId } = job?.data;

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
      } = mailMetaDoc as any;

      const mailObjects = await fetchEmails(emailAddress, {
        lastHistoryId: lastHistoryId ?? historyId,
        access_token,
        id_token,
        refresh_token,
      });

      const Groq = new GroqChatHandler();

      await Bluebird.mapSeries(mailObjects, async (mailObj) => {
        if (mailObj.From.includes(emailAddress)) return;

        try {
          const AIResponse = await Groq.analyzeEmailContent(
            mailObj.mailContent,
            persona
          );

          const parsedResponse = Groq.getCategoryNResponseMail(AIResponse);

          // Review-mode: park the draft in the outbox instead of sending.
          if (autoSend === false) {
            await PendingDraftModel.create({
              userId,
              accountId,
              emailID: emailAddress,
              threadId: mailObj.threadId,
              messageId: mailObj["Message-Id"],
              from: mailObj.From,
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
            emailAddress
          );

          await modifyThreadAddLabel(
            mailObj.threadId,
            labelId,
            creds,
            emailAddress
          );

          await sendReply(
            {
              from: mailObj.To,
              threadId: mailObj.threadId,
              messageId: mailObj["Message-Id"],
              mailContent: parsedResponse.responseMail,
              to: mailObj.From, //from becomes to as we giving response mail to sender
              subject: "Re: " + mailObj.Subject,
            },
            creds,
            emailAddress
          );

          await ProcessedEmailModel.create({
            userId,
            emailID: emailAddress,
            threadId: mailObj.threadId,
            subject: mailObj.Subject,
            from: mailObj.From,
            category: parsedResponse.category,
          });
        } catch (err: any) {
          // Isolate failures per-message so one bad thread doesn't fail
          // the whole job and cause already-replied messages to be redone.
          logger.error(
            { err, threadId: mailObj.threadId },
            "Failed to process message"
          );
        }
      });
    },
    workerOptions
  );

  emailWorker.on("completed", (job) =>
    logger.info(`Email job ${job.id} completed.`)
  );
  emailWorker.on("failed", (job, err) =>
    logger.error({ err, jobId: job?.id }, "Email job failed")
  );

  return emailWorker;
}
