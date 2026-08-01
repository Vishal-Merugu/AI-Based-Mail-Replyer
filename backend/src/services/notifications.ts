import UserModel from "../models/user";
import { logger } from "../utils/logger";

const SLACK_WEBHOOK_HOST = "hooks.slack.com";
const SLACK_WEBHOOK_PATH_PREFIX = "/services/";
const SLACK_POST_TIMEOUT_MS = 5000;

/**
 * Webhook URLs are user-supplied and fetched server-side, which is a
 * server-side request forgery primitive: without this check a user can point
 * it at cloud metadata (169.254.169.254), an internal Redis/Mongo port, or
 * any other host the app server can reach. Only real Slack webhooks pass.
 */
export function isValidSlackWebhookUrl(raw: string | undefined | null): boolean {
  if (!raw) return false;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    url.hostname === SLACK_WEBHOOK_HOST &&
    url.pathname.startsWith(SLACK_WEBHOOK_PATH_PREFIX)
  );
}

async function postToSlack(url: string, text: string): Promise<void> {
  // Re-validate at send time as well as on write: rows persisted before this
  // check existed, or written by another path, must not become SSRF vectors.
  if (!isValidSlackWebhookUrl(url)) {
    logger.warn("Refusing to post to a non-Slack webhook URL");
    return;
  }

  // Without a timeout a hung or deliberately-slow endpoint stalls the worker.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SLACK_POST_TIMEOUT_MS);

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
      redirect: "error", // a 3xx to an internal host would re-open the SSRF
    });
  } catch (err) {
    logger.warn({ err }, "Slack webhook post failed");
  } finally {
    clearTimeout(timer);
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
