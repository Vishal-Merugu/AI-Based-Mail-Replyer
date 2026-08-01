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
    /** Normalized sender address, carried through to ProcessedEmail on
     *  approval so review-mode replies also count toward the loop cap. */
    fromAddress: { type: String, lowercase: true, trim: true },
    to: String,
    subject: String,
    incomingSnippet: String,
    draftBody: String,
    category: String,
    status: {
      // "sending" is claimed-but-unconfirmed — it stops two concurrent
      // approvals from both dispatching the same draft.
      type: String,
      enum: ["pending", "sending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Backs GET /drafts, which filters { userId, status } and sorts by createdAt.
pendingDraftSchema.index({ userId: 1, status: 1, createdAt: -1 });

export type PendingDraft = InferSchemaType<typeof pendingDraftSchema>;

export default model<PendingDraft>("pendingdrafts", pendingDraftSchema);
