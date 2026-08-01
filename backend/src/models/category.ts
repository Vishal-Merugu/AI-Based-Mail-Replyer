import { InferSchemaType, Schema, model } from "mongoose";

const categorySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    replyTemplate: { type: String, default: "" },
    dontReply: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

export type Category = InferSchemaType<typeof categorySchema>;

export default model<Category>("category", categorySchema);
