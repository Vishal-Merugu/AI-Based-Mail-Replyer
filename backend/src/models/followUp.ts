import { InferSchemaType, Schema, model } from "mongoose";

const followUpSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "mailmetadetails",
      required: true,
      index: true,
    },
    emailID: { type: String, required: true },
    threadId: { type: String, required: true, index: true },
    messageId: String,
    to: { type: String, required: true },
    subject: String,
    scheduledAt: { type: Date, required: true, index: true },
    attemptNumber: { type: Number, default: 1 },
    maxAttempts: { type: Number, default: 2 },
    intervalDays: { type: Number, default: 3 },
    status: {
      // "sending" is a claimed-but-not-confirmed state. A job that dies
      // between the Gmail send and the status write stays here rather than
      // reverting to "pending", because re-sending is worse than not.
      type: String,
      enum: ["pending", "sending", "sent", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Backs the cancel-on-reply sweep, which filters { accountId, threadId, status }.
followUpSchema.index({ accountId: 1, threadId: 1, status: 1 });

export type FollowUp = InferSchemaType<typeof followUpSchema>;

export default model<FollowUp>("followups", followUpSchema);
