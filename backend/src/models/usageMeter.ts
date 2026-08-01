import { InferSchemaType, Schema, model } from "mongoose";

const usageMeterSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    // First day of the calendar month this counter belongs to (UTC).
    periodStart: { type: Date, required: true },
    replyCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

usageMeterSchema.index({ userId: 1, periodStart: 1 }, { unique: true });

export type UsageMeter = InferSchemaType<typeof usageMeterSchema>;

export default model<UsageMeter>("usagemeters", usageMeterSchema);
