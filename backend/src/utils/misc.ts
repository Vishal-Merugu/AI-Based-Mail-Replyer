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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

// Multipart/alternative reply with both a plain-text body and an HTML body,
// so clients pick whichever they render best. Adds a quoted context block if
// `quotedContext` is provided.
export function encodeEmail({
  from,
  to,
  subject,
  messageId,
  mailContent,
  quotedContext,
}: {
  from: string;
  to: string;
  subject: string;
  messageId: string;
  mailContent: string;
  quotedContext?: string;
}): string {
  const boundary = "mrb_" + Math.random().toString(36).slice(2) + Date.now();

  const plainBody =
    mailContent +
    (quotedContext
      ? "\n\n" +
        quotedContext
          .split("\n")
          .map((l) => "> " + l)
          .join("\n")
      : "");

  const htmlBody =
    textToHtml(mailContent) +
    (quotedContext
      ? `\n<blockquote style="border-left:2px solid #ccc;padding-left:8px;color:#666;">${textToHtml(
          quotedContext
        )}</blockquote>`
      : "");

  const mimeMessage = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    plainBody,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    `<div>${htmlBody}</div>`,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");

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
