import Bluebird from "bluebird";
import { FilterQuery, QueryOptions, UpdateQuery } from "mongoose";
import { GoogleApis, gmail_v1 } from "googleapis";
import { Credentials, OAuth2Client } from "google-auth-library";

import ENV from "../utils/validateEnv";
import MailMetaModel, { MailMeta } from "../models/mailMeta";
import { encodeEmail } from "../utils/misc";
import { logger } from "../utils/logger";

const google = new GoogleApis();

// The `gmail` API wrapper is stateless — credentials are supplied per call via
// the `auth` option — so it is safe to share across users.
const gmail = google.gmail("v1");

/**
 * Build a FRESH OAuth2 client for a single operation.
 *
 * This must never be hoisted into a module-level singleton: `setCredentials`
 * mutates the client, so a shared instance lets one user's tokens overwrite
 * another's between the setCredentials call and the API call — which sends
 * mail from the wrong mailbox. One client per operation is the isolation
 * boundary.
 */
function createGmailAuth(creds: Credentials, emailId?: string): OAuth2Client {
  const auth = new google.auth.OAuth2(
    ENV.GOOGLE_CLIENT_ID,
    ENV.GOOGLE_CLIENT_SECRET,
    ENV.GOOGLE_REDIRECT_URI
  );

  auth.setCredentials(creds);

  if (emailId) {
    // googleapis auto-refreshes an expired access_token on the next API call
    // and emits 'tokens' with the new value — persist it so we don't keep
    // using a stale token (and silently fail) on subsequent jobs. The client
    // is per-operation, so this listener cannot accumulate or fire against
    // another account's record.
    auth.on("tokens", (tokens) => {
      if (!tokens.access_token) return;

      findOneAndUpdateMailModel(
        { emailID: emailId },
        {
          access_token: tokens.access_token,
          ...(tokens.refresh_token
            ? { refresh_token: tokens.refresh_token }
            : {}),
          ...(tokens.expiry_date
            ? { expiry_date: new Date(tokens.expiry_date) }
            : {}),
        }
      ).catch((err) =>
        logger.error({ err, emailId }, "Failed to persist refreshed token")
      );
    });
  }

  return auth;
}

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
    gmailMessageId: string;
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
    const auth = createGmailAuth(
      {
        access_token: fetchMailProps.access_token,
        refresh_token: fetchMailProps.refresh_token,
        id_token: fetchMailProps.id_token,
      },
      emailId
    );

    const history = await listHistory(fetchMailProps.lastHistoryId, auth);

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
                  userId: "me",
                  id: messageId,
                  auth,
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
              gmailMessageId: message?.data?.id || "",
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

      return messages as fetchEmailsReturn;
    }

    logger.info("No new messages since last checked.");
    return [];
  } catch (error) {
    logger.error({ error }, "Gmail API returned an error while fetching emails");
    return [];
  }
}

export async function extractAttachmentText(
  messageId: string,
  creds: Credentials,
  emailId?: string
): Promise<string> {
  const auth = createGmailAuth(creds, emailId);

  try {
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      auth,
      format: "full",
    });

    const attachments: Array<{ name: string; id: string; mime: string }> = [];
    const walk = (part: any) => {
      if (!part) return;
      if (part.body?.attachmentId && part.filename) {
        attachments.push({
          name: part.filename,
          id: part.body.attachmentId,
          mime: part.mimeType || "",
        });
      }
      (part.parts || []).forEach(walk);
    };
    walk(msg.data.payload);

    // Only handle PDFs — cheap-and-fast, most common case.
    const pdfs = attachments.filter((a) => a.mime === "application/pdf");
    if (!pdfs.length) return "";

    // Lazy-require to keep pdf-parse's odd top-level test file access from
    // running when we don't need it.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse");

    const chunks: string[] = [];
    for (const att of pdfs.slice(0, 3)) {
      try {
        const res = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId,
          id: att.id,
          auth,
        });
        if (!res.data.data) continue;
        const buf = Buffer.from(res.data.data, "base64");
        const parsed = await pdfParse(buf);
        const text = (parsed?.text || "").slice(0, 4000);
        if (text) chunks.push(`[${att.name}]\n${text}`);
      } catch {
        /* ignore individual attachment errors */
      }
    }
    return chunks.join("\n\n");
  } catch {
    return "";
  }
}

export async function getThreadMessages(
  threadId: string,
  creds: Credentials,
  emailId?: string
): Promise<Array<{ from: string; date: string; snippet: string }>> {
  const auth = createGmailAuth(creds, emailId);

  try {
    const res = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
      auth,
      format: "metadata",
      metadataHeaders: ["From", "Date"],
    });

    const messages = res.data.messages || [];
    return messages.map((m) => {
      const headers = m.payload?.headers || [];
      const fromHeader = headers.find(
        (h) => h.name?.toLowerCase() === "from"
      );
      const dateHeader = headers.find(
        (h) => h.name?.toLowerCase() === "date"
      );
      return {
        from: fromHeader?.value || "",
        date: dateHeader?.value || "",
        snippet: m.snippet || "",
      };
    });
  } catch (err) {
    return [];
  }
}

/**
 * (Re-)establish the Gmail push notification subscription for a mailbox.
 *
 * Gmail watches expire after ~7 days. Calling this is idempotent — Google
 * simply resets the clock — so it is safe to run on a schedule. Returns the
 * new expiration so callers can persist it and drive renewal.
 */
export async function establishWatch(
  creds: Credentials,
  emailId: string
): Promise<{ historyId?: string; expiration?: Date }> {
  const auth = createGmailAuth(creds, emailId);

  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      labelIds: ["INBOX"],
      topicName: ENV.GC_TOPIC_NAME,
    },
    auth,
  });

  return {
    historyId: res.data.historyId ?? undefined,
    // Gmail returns expiration as epoch milliseconds in a string.
    expiration: res.data.expiration
      ? new Date(Number(res.data.expiration))
      : undefined,
  };
}

export async function listHistory(
  startHistoryId: string,
  auth: OAuth2Client
) {
  const res = await gmail.users.history.list({
    userId: "me",
    startHistoryId: startHistoryId ?? "",
    auth,
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
  creds: Credentials,
  emailId?: string
) {
  const auth = createGmailAuth(creds, emailId);
  await gmail.users.threads.modify({
    userId: "me",
    id: threadId,
    requestBody: {
      addLabelIds: [labelId],
    },
    auth,
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
    quotedContext,
  }: {
    from: string;
    threadId: string;
    messageId: string;
    mailContent: string;
    to: string;
    subject: string;
    quotedContext?: string;
  },
  creds: Credentials,
  emailId?: string
) {
  const auth = createGmailAuth(creds, emailId);

  const raw = encodeEmail({
    from: from,
    to: to,
    subject,
    messageId,
    mailContent,
    quotedContext,
  });

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: raw,
      threadId: threadId,
    },
    auth,
  });
}

export async function createLabelOrGetExisting(
  labelName: string,
  creds: Credentials,
  emailId?: string
): Promise<string> {
  const auth = createGmailAuth(creds, emailId);

  const labelsRes = await gmail.users.labels.list({
    userId: "me",
    auth,
  });

  const existingLabels = labelsRes.data.labels;
  const existingLabel = existingLabels?.find(
    (label) => label?.name?.toLowerCase() === labelName.toLowerCase()
  );

  if (existingLabel) return existingLabel.id as string;

  const res = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name: labelName,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
    auth,
  });
  return res.data.id as string;
}
