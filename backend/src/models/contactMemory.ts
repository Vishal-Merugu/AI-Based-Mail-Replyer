import { InferSchemaType, Schema, model } from "mongoose";

const contactMemorySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

contactMemorySchema.index({ userId: 1, contactEmail: 1 }, { unique: true });

export type ContactMemory = InferSchemaType<typeof contactMemorySchema>;

export default model<ContactMemory>("contactmemories", contactMemorySchema);
