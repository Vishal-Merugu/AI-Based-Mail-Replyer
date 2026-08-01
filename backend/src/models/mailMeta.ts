import { InferSchemaType, Schema, model } from "mongoose";
import { encrypt, decrypt, isEncrypted } from "../utils/crypto";

const mailMetaSchema = new Schema(
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
    access_token: String,
    refresh_token: String,
    id_token: String,
    expiry_date: Date,
    lastHistoryId: String,
    // Gmail watch subscriptions expire after ~7 days and must be renewed or
    // the account silently stops receiving Pub/Sub notifications.
    watchExpiration: { type: Date, index: true },
    autoSend: { type: Boolean, default: true },
    followUp: {
      enabled: { type: Boolean, default: false },
      intervalDays: { type: Number, default: 3 },
      maxAttempts: { type: Number, default: 2 },
    },
    persona: {
      name: { type: String, default: "" },
      tone: { type: String, default: "professional" },
      signature: { type: String, default: "" },
      extraInstructions: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// OAuth tokens grant full Gmail read/send access — never store them in
// plaintext. These hooks make encryption/decryption transparent to callers.
const SECRET_FIELDS = ["access_token", "refresh_token", "id_token"] as const;

function encryptSecretFields(target: Record<string, any> | undefined | null) {
  if (!target) return;
  for (const field of SECRET_FIELDS) {
    if (target[field] && !isEncrypted(target[field])) {
      target[field] = encrypt(target[field]);
    }
  }
}

function decryptSecretFields(doc: any) {
  if (!doc) return;
  for (const field of SECRET_FIELDS) {
    if (isEncrypted(doc[field])) {
      doc[field] = decrypt(doc[field]);
    }
  }
}

mailMetaSchema.pre("save", function (next) {
  encryptSecretFields(this as unknown as Record<string, any>);
  next();
});

mailMetaSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as Record<string, any>;
  encryptSecretFields(update);
  encryptSecretFields(update?.$set);
  next();
});

mailMetaSchema.post(
  ["find", "findOne", "findOneAndUpdate"],
  function (result) {
    if (Array.isArray(result)) {
      result.forEach(decryptSecretFields);
    } else {
      decryptSecretFields(result);
    }
  }
);

export type MailMeta = InferSchemaType<typeof mailMetaSchema>;

export default model<MailMeta>("mailmetadetails", mailMetaSchema);
