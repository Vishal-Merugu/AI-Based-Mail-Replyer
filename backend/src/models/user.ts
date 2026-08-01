import { InferSchemaType, Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: String,
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema>;

export default model<User>("user", userSchema);
