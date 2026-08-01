import { InferSchemaType, Schema, model } from "mongoose";

const processedEmailSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    emailID: {
      type: String,
      required: true,
    },
    threadId: String,
    subject: String,
    from: String,
    /** Normalized sender address, for exact-match loop-rate queries. */
    fromAddress: { type: String, lowercase: true, trim: true },
    category: String,
  },
  { timestamps: true }
);

// Backs the per-contact auto-reply rate check in the email worker.
processedEmailSchema.index({
  userId: 1,
  emailID: 1,
  fromAddress: 1,
  createdAt: -1,
});

export type ProcessedEmail = InferSchemaType<typeof processedEmailSchema>;

export default model<ProcessedEmail>("processedemails", processedEmailSchema);
