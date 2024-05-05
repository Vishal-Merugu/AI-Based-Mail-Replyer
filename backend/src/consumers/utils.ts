import Bluebird from "bluebird";
import { FilterQuery, QueryOptions, UpdateQuery } from "mongoose";
import { GoogleApis, gmail_v1 } from "googleapis";

import { Credentials } from "../../node_modules/google-auth-library/build/src/auth/credentials";

import ENV from "../utils/validateEnv";
import MailMetaModel, { MailMeta } from "../models/mailMeta";
import { encodeEmail } from "../utils/misc";

const google = new GoogleApis();
const googleOAuth2 = google.auth.OAuth2;

const oAuth2Client = new googleOAuth2(
  ENV.GOOGLE_CLIENT_ID,
  ENV.GOOGLE_CLIENT_SECRET,
  ENV.GOOGLE_REDIRECT_URI
);
const gmail = google.gmail("v1");

const MAIL_HEADER_KEYS = [
  "To",
  "From",
  "Date",
  "Subject",
  "Message-Id",
] as const;

type MailHeaderKey = (typeof MAIL_HEADER_KEYS)[number];

function extractHeaderData(
  headers: gmail_v1.Schema$MessagePartHeader[]
): Record<MailHeaderKey, string> {
  let obj: Record<MailHeaderKey, string> = {
    To: "",
    From: "",
    Date: "",
    Subject: "",
    "Message-Id": "",
  };

  headers.forEach((header) => {
    if (
      header.name &&
      MAIL_HEADER_KEYS.includes(header.name as MailHeaderKey)
    ) {
      obj[header.name as MailHeaderKey] = header.value || "";
    }
  });

  return obj;
}

type fetchEmailsReturn = Array<
  Record<MailHeaderKey, string> & {
    threadId: string;
    mailContent: string;
    labelIds: string[];
  }
>;

export type fetchMailProps = {
  lastHistoryId: string;
  refresh_token?: string;
  access_token: string;
  id_token?: string;
};

export async function fetchEmails(
  emailId: string,
  fetchMailProps: fetchMailProps
): Promise<fetchEmailsReturn> {
  try {
    setCredentialsForoAuth(oAuth2Client, {
      access_token: fetchMailProps.access_token,
      refresh_token: fetchMailProps.refresh_token,
      id_token: fetchMailProps.id_token,
    });

    const history = await listHistory(fetchMailProps.lastHistoryId);

    findOneAndUpdateMailModel(
      { emailID: emailId },
      { lastHistoryId: history.historyId }
    );

    if (history.history) {
      const messagePromises = [];

      for (const historyItem of history.history) {
        if (historyItem.messagesAdded) {
          for (const added of historyItem.messagesAdded) {
            const messageId = added?.message?.id;
            messageId &&
              messagePromises.push(
                gmail.users.messages.get({
                  userId: "ME",
                  id: messageId,
                  auth: oAuth2Client,
                  format: "full",
                })
              );
          }
        }
      }

      const messages = await Bluebird.map(
        messagePromises,
        (message) => {
          const headers = message?.data?.payload?.headers;

          if (headers) {
            return {
              threadId: message?.data?.threadId || "",
              mailContent: message?.data?.snippet || "",
              labelIds: message?.data?.labelIds || [],
              ...extractHeaderData(headers),
            };
          }
        },
        {
          concurrency: 5,
        }
      );

      return Promise.resolve(messages as fetchEmailsReturn);
    } else {
      console.log("No new messages since last checked.");
      return Promise.resolve([]);
    }
  } catch (error) {
    console.error("The API returned an error: " + error);
    return Promise.resolve([]);
  }
}

export async function listHistory(startHistoryId: string) {
  const res = await gmail.users.history.list({
    userId: "ME",
    startHistoryId: startHistoryId ?? "",
    auth: oAuth2Client,
  });
  return res.data;
}

export function getMailMetaModel(
  query: FilterQuery<MailMeta>
): Promise<MailMeta | null> {
  return MailMetaModel.findOne(query).exec();
}

export function findOneAndUpdateMailModel(
  filter: FilterQuery<MailMeta>,
  updatedoc: UpdateQuery<MailMeta>,
  options?: QueryOptions<MailMeta>
): Promise<Document | MailMeta | null> {
  const model = MailMetaModel.findOneAndUpdate(filter, updatedoc);
  options && Object.keys(options).length && model.setOptions(options);
  return Promise.resolve(model.exec());
}

export async function modifyThreadAddLabel(
  threadId: string,
  labelId: string,
  creds: Credentials
) {
  setCredentialsForoAuth(oAuth2Client, creds);
  await gmail.users.threads.modify({
    userId: "me",
    id: threadId,
    requestBody: {
      addLabelIds: [labelId],
    },
    auth: oAuth2Client,
  });
}

export async function sendReply(
  {
    from,
    threadId,
    messageId,
    mailContent,
    to,
    subject,
  }: Record<string, string>,
  creds: Credentials
) {
  setCredentialsForoAuth(oAuth2Client, creds);

  const raw = encodeEmail({
    from: from,
    to: to,
    subject,
    messageId,
    mailContent,
  });

  await gmail.users.messages.send({
    userId: "ME",
    requestBody: {
      raw: raw,
      threadId: threadId,
    },
    auth: oAuth2Client,
  });
}

export function setCredentialsForoAuth(
  auth: typeof oAuth2Client,
  creds: Credentials
) {
  return auth.setCredentials(creds);
}

export async function createLabelorGetExisting(
  labelName: string,
  creds: Credentials
): Promise<string> {
  setCredentialsForoAuth(oAuth2Client, creds);

  const labelsRes = await gmail.users.labels.list({
    userId: "me",
    auth: oAuth2Client,
  });

  const existingLabels = labelsRes.data.labels;
  const existingLabel = existingLabels?.find(
    (label) => label?.name?.toLowerCase() === labelName.toLowerCase()
  );

  if (existingLabel) return existingLabel.id as string;

  const res = await gmail.users.labels.create({
    userId: "ME",
    requestBody: {
      name: labelName,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
    auth: oAuth2Client,
  });
  return res.data.id as string;
}
