import { InferSchemaType, Schema, model } from "mongoose";

const mailMetaSchema = new Schema(
  {
    emailID: {
      type: String,
      required: true,
    },
    access_token: String,
    refresh_token: String,
    id_token: String,
    expiry_date: Date,
    lastHistoryId: String,
  },
  { timestamps: true }
);

export type MailMeta = InferSchemaType<typeof mailMetaSchema>;

export default model<MailMeta>("mailmetadetails", mailMetaSchema);
