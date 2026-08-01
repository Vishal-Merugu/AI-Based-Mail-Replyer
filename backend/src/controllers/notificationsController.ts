import { Request, Response } from "express";

import UserModel from "../models/user";
import { isValidSlackWebhookUrl } from "../services/notifications";
import { logger } from "../utils/logger";

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.user!.userId, "notifications").lean();
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }
    res.status(200).send(user.notifications || {});
  } catch (err: any) {
    logger.error({ err }, "Error getting notifications");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const updateNotifications = async (req: Request, res: Response) => {
  try {
    const {
      slackWebhookUrl,
      notifyOnInterested,
      notifyOnFailure,
      digestEnabled,
      digestCadence,
    } = req.body ?? {};

    // Reject at write time so the user gets real feedback, rather than
    // silently saving a URL that the sender will later refuse to call.
    if (slackWebhookUrl && !isValidSlackWebhookUrl(slackWebhookUrl)) {
      res.status(400).send({
        message:
          "slackWebhookUrl must be an https://hooks.slack.com/services/... URL",
      });
      return;
    }

    const user = await UserModel.findByIdAndUpdate(
      req.user!.userId,
      {
        notifications: {
          slackWebhookUrl: slackWebhookUrl ?? "",
          notifyOnInterested: !!notifyOnInterested,
          notifyOnFailure: !!notifyOnFailure,
          digestEnabled: !!digestEnabled,
          digestCadence:
            digestCadence === "daily" ? "daily" : "weekly",
        },
      },
      { new: true }
    ).lean();
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }
    res.status(200).send(user.notifications || {});
  } catch (err: any) {
    logger.error({ err }, "Error updating notifications");
    res.status(500).send({ message: "Internal Server Error" });
  }
};
