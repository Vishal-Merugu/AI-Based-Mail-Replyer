import crypto from "crypto";

import { redisConnection } from "../queue";

const LOCK_PREFIX = "mailbox-lock:";
// Long enough to cover a slow batch (LLM + Gmail round-trips), short enough
// that a crashed worker's lock frees itself.
const LOCK_TTL_MS = 10 * 60 * 1000;

/**
 * Serializes email-job processing per mailbox.
 *
 * Two Pub/Sub notifications for the same mailbox can be picked up
 * concurrently once worker concurrency > 1. Both would read the same
 * lastHistoryId, fetch the same messages and send duplicate replies —
 * concurrency of 1 was the only thing preventing that before.
 */
export async function acquireMailboxLock(
  emailAddress: string,
): Promise<string | null> {
  const token = crypto.randomUUID();
  const result = await redisConnection.set(
    LOCK_PREFIX + emailAddress,
    token,
    "PX",
    LOCK_TTL_MS,
    "NX",
  );
  return result === "OK" ? token : null;
}

/** Compare-and-delete so a slow job can never release a successor's lock. */
export async function releaseMailboxLock(
  emailAddress: string,
  token: string,
): Promise<void> {
  const script =
    'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
  await redisConnection.eval(script, 1, LOCK_PREFIX + emailAddress, token);
}

/** Signals that another job holds the mailbox; BullMQ should retry. */
export class MailboxBusyError extends Error {
  constructor(emailAddress: string) {
    super(`Mailbox ${emailAddress} is already being processed`);
    this.name = "MailboxBusyError";
  }
}
