import UserModel from "../models/user";
import { logger } from "../utils/logger";

async function postToSlack(url: string, text: string): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    logger.warn({ err }, "Slack webhook post failed");
  }
}

export async function notifyInterestedReply(
  userId: string,
  emailID: string,
  from: string,
  subject: string
) {
  const user = await UserModel.findById(userId).lean();
  if (!user?.notifications?.slackWebhookUrl) return;
  if (!user.notifications.notifyOnInterested) return;

  const text = `:tada: *Interested* reply on ${emailID}\nFrom: ${from}\nSubject: ${subject}`;
  await postToSlack(user.notifications.slackWebhookUrl, text);
}

export async function notifyJobFailure(
  userId: string,
  emailID: string,
  errorMessage: string
) {
  const user = await UserModel.findById(userId).lean();
  if (!user?.notifications?.slackWebhookUrl) return;
  if (!user.notifications.notifyOnFailure) return;

  const text = `:warning: Reply job failed on ${emailID}\n\`\`\`${errorMessage}\`\`\``;
  await postToSlack(user.notifications.slackWebhookUrl, text);
}

export async function sendDigest(userId: string, text: string) {
  const user = await UserModel.findById(userId).lean();
  if (!user?.notifications?.slackWebhookUrl) return;
  await postToSlack(user.notifications.slackWebhookUrl, text);
}
