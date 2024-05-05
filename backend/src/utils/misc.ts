import { NextFunction, Request, Response } from "express";
import { Buffer } from "buffer";

export const readRequestBody = (req: Request): Promise<string> => {
  return new Promise((resolve, reject) => {
    let body: Buffer[] = [];
    req
      .on("data", (chunk: Buffer) => {
        body.push(chunk);
      })
      .on("end", () => {
        const bodyString = Buffer.concat(body).toString();
        resolve(JSON.parse(bodyString));
      })
      .on("error", (err) => {
        reject(err);
      });
  });
};

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

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const now = new Date();
  console.log(`${now.toISOString()} - ${req.method} ${req.path}`);
  next();
};
