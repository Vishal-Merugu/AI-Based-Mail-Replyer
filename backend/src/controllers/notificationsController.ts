import { Request, Response } from "express";
import { z } from "zod";

import UserModel from "../models/user";
import { isValidSlackWebhookUrl } from "../services/notifications";
import { notFound } from "../errors/AppError";

export const notificationsSchema = z.object({
  slackWebhookUrl: z
    .string()
    .default("")
    .refine((v) => v === "" || isValidSlackWebhookUrl(v), {
      message:
        "slackWebhookUrl must be an https://hooks.slack.com/services/... URL",
    }),
  notifyOnInterested: z.boolean().default(true),
  notifyOnFailure: z.boolean().default(true),
  digestEnabled: z.boolean().default(false),
  digestCadence: z.enum(["daily", "weekly"]).default("weekly"),
});

export const getNotifications = async (req: Request, res: Response) => {
  const user = await UserModel.findById(
    req.user!.userId,
    "notifications"
  ).lean();
  if (!user) throw notFound("User not found");
  res.status(200).send(user.notifications || {});
};

export const updateNotifications = async (req: Request, res: Response) => {
  const notifications = req.body as z.infer<typeof notificationsSchema>;

  const user = await UserModel.findByIdAndUpdate(
    req.user!.userId,
    { notifications },
    { new: true }
  ).lean();
  if (!user) throw notFound("User not found");

  res.status(200).send(user.notifications || {});
};
