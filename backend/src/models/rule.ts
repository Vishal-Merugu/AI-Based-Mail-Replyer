import { InferSchemaType, Schema, model } from "mongoose";

export const RULE_MATCH_TYPES = [
  "from-domain",
  "from-address",
  "subject-contains",
] as const;

export const RULE_ACTIONS = ["force-category", "skip-reply"] as const;

const ruleSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    matchType: {
      type: String,
      enum: RULE_MATCH_TYPES,
      required: true,
    },
    matchValue: { type: String, required: true },
    action: { type: String, enum: RULE_ACTIONS, required: true },
    // Required when action = force-category
    categoryName: { type: String, default: "" },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type Rule = InferSchemaType<typeof ruleSchema>;

export default model<Rule>("rule", ruleSchema);
