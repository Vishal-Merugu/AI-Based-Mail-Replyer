import { InferSchemaType, Schema, model } from "mongoose";

/**
 * Idempotency record: proves a Gmail message has already been acted on.
 *
 * Pub/Sub delivery is at-least-once and BullMQ retries failed jobs, so
 * without this a job that fails *after* sending re-sends the same reply on
 * retry. The unique index is the actual guarantee — two concurrent workers
 * racing on the same message will see exactly one insert succeed.
 */
const messageClaimSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    gmailMessageId: { type: String, required: true },
    status: {
      type: String,
      enum: ["processing", "done"],
      default: "processing",
    },
    claimedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

messageClaimSchema.index({ userId: 1, gmailMessageId: 1 }, { unique: true });

// Claims are only useful while a redelivery is plausible; expire them so the
// collection does not grow without bound.
messageClaimSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

export type MessageClaim = InferSchemaType<typeof messageClaimSchema>;

export default model<MessageClaim>("messageclaims", messageClaimSchema);
