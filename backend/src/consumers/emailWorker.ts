import { QueueBaseOptions, Worker } from "bullmq";

import { emailQueue } from "../queue";
import {
  createLabelorGetExisting,
  fetchEmails,
  getMailMetaModel,
  modifyThreadAddLabel,
  sendReply,
} from "./utils";
import GroqChatHandler from "../groq";
import Bluebird from "bluebird";

export default function startEmailWorker(QueueBaseOptions?: QueueBaseOptions) {
  try {
    const emailWorker = new Worker(
      emailQueue.name,
      async (job) => {
        console.log(`Processing email job: ${job.id}`);
        const { emailAddress, historyId } = job?.data;

        const mailMetaDoc = await getMailMetaModel({
          emailID: emailAddress,
        });

        if (!mailMetaDoc || !mailMetaDoc.access_token)
          throw Error("MAIL with acces token was not registered");

        const { access_token, id_token, refresh_token, lastHistoryId } =
          mailMetaDoc;

        const mailObjects = await fetchEmails(emailAddress, {
          lastHistoryId: lastHistoryId ?? historyId,
          access_token,
          id_token,
          refresh_token,
        });

        const Groq = new GroqChatHandler();

        Bluebird.mapSeries(mailObjects, async (mailObj) => {
          const AIResponse = await Groq.analyzeEmailContent(
            mailObj.mailContent
          );

          if (mailObj.From.includes(emailAddress)) return Promise.resolve();

          const parsedResponse = Groq.getCategoryNResponseMail(AIResponse);

          const creds = {
            access_token,
            id_token,
            refresh_token,
          };

          const labelId = await createLabelorGetExisting(
            parsedResponse.category,
            creds
          );

          await modifyThreadAddLabel(mailObj.threadId, labelId, creds);

          await sendReply(
            {
              from: mailObj.To,
              threadId: mailObj.threadId,
              messageId: mailObj["Message-Id"],
              mailContent: parsedResponse.responseMail,
              to: mailObj.From, //from becomes to as we giving response mail to sender
              subject: "Re: " + mailObj.Subject,
            },
            creds
          );

          return Promise.resolve();
        });
      },
      QueueBaseOptions
    );

    emailWorker.on("completed", (job) =>
      console.log(`Email job ${job.id} completed.`)
    );
    emailWorker.on("failed", (job, err) =>
      console.error(`Email job ${job?.id} failed with error: ${err.message}`)
    );

    return Promise.resolve();
  } catch (err: any) {
    console.log("ERROR IN EMAIL WORKER", err.toString());
    return Promise.reject(err);
  }
}
