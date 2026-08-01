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
      type: String,
      enum: ["pending", "sent", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export type FollowUp = InferSchemaType<typeof followUpSchema>;

export default model<FollowUp>("followups", followUpSchema);
