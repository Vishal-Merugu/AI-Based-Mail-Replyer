import { NextFunction, Request, Response } from "express";
import { Buffer } from "buffer";

import { logger } from "./logger";

export type GmailPubSubNotification = {
  emailAddress: string;
  historyId: string;
};

// Google Cloud Pub/Sub push payload shape:
// { message: { data: "<base64 JSON>", messageId, publishTime }, subscription }
export function decodePubSubMessage(
  body: any
): GmailPubSubNotification | undefined {
  const data = body?.message?.data;
  if (!data) return undefined;

  const decoded = Buffer.from(data, "base64").toString("utf-8");
  return JSON.parse(decoded);
}

export function encodeEmail({
  from,
  to,
  subject,
  messageId,
  mailContent,
}: Record<string, string>) {
  const mimeMessage = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
    "",
    `${mailContent}`,
  ].join("\n");

  return Buffer.from(mimeMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.info({ method: req.method, path: req.path }, "incoming request");
  next();
};
