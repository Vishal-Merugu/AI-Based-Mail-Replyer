import MessageClaimModel from "../models/messageClaim";
import { logger } from "../utils/logger";

const DUPLICATE_KEY = 11000;

/**
 * A worker that dies mid-message leaves a "processing" claim behind. After
 * this long we assume the holder is gone and allow one reclaim, so a crash
 * doesn't strand the message forever.
 */
const STALE_CLAIM_MS = 15 * 60 * 1000;

/**
 * Try to take exclusive responsibility for replying to a Gmail message.
 *
 * Returns false when the message has already been handled (or is actively
 * being handled), in which case the caller must skip it.
 */
export async function claimMessage(
  userId: string,
  gmailMessageId: string
): Promise<boolean> {
  try {
    await MessageClaimModel.create({
      userId,
      gmailMessageId,
      status: "processing",
      claimedAt: new Date(),
    });
    return true;
  } catch (err: any) {
    if (err?.code !== DUPLICATE_KEY) throw err;

    // Someone holds it. Take over only if their claim is stale — a completed
    // claim ("done") is never reclaimable, which is what stops re-sends.
    const reclaimed = await MessageClaimModel.findOneAndUpdate(
      {
        userId,
        gmailMessageId,
        status: "processing",
        claimedAt: { $lte: new Date(Date.now() - STALE_CLAIM_MS) },
      },
      { claimedAt: new Date() }
    );

    if (reclaimed) {
      logger.warn(
        { gmailMessageId },
        "Reclaimed a stale message claim (previous worker likely died)"
      );
      return true;
    }
    return false;
  }
}

/** Mark the message finished — it will never be processed again. */
export async function completeMessageClaim(
  userId: string,
  gmailMessageId: string
): Promise<void> {
  await MessageClaimModel.updateOne(
    { userId, gmailMessageId },
    { status: "done" }
  );
}

/**
 * Give the claim back after a failure so a retry can legitimately redo the
 * work. Without this, one transient error would permanently skip the message.
 */
export async function releaseMessageClaim(
  userId: string,
  gmailMessageId: string
): Promise<void> {
  await MessageClaimModel.deleteOne({
    userId,
    gmailMessageId,
    status: "processing",
  });
}
