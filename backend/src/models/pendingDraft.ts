import { InferSchemaType, Schema, model } from "mongoose";

const pendingDraftSchema = new Schema(
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
    threadId: String,
    messageId: String,
    from: String,
    to: String,
    subject: String,
    incomingSnippet: String,
    draftBody: String,
    category: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export type PendingDraft = InferSchemaType<typeof pendingDraftSchema>;

export default model<PendingDraft>("pendingdrafts", pendingDraftSchema);
