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
    category: String,
  },
  { timestamps: true }
);

export type ProcessedEmail = InferSchemaType<typeof processedEmailSchema>;

export default model<ProcessedEmail>("processedemails", processedEmailSchema);
