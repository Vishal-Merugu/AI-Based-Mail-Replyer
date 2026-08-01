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
    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    notifications: {
      slackWebhookUrl: { type: String, default: "" },
      notifyOnInterested: { type: Boolean, default: true },
      notifyOnFailure: { type: Boolean, default: true },
      digestEnabled: { type: Boolean, default: false },
      digestCadence: {
        type: String,
        enum: ["daily", "weekly"],
        default: "weekly",
      },
    },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema>;

export default model<User>("user", userSchema);
