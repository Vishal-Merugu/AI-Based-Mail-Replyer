import { Worker, WorkerOptions } from "bullmq";
import mongoose from "mongoose";

import { digestQueue } from "../queue";
import UserModel from "../models/user";
import ProcessedEmailModel from "../models/processedEmail";
import { sendDigest } from "../services/notifications";
import { logger } from "../utils/logger";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

async function buildDigestFor(userId: string, windowDays: number): Promise<string> {
  const since = new Date(Date.now() - windowDays * DAY_MS);
  const rows = await ProcessedEmailModel.aggregate([
    // Must be a real ObjectId: aggregation pipelines get no schema casting
    // (unlike find), so a string userId silently matched nothing and every
    // digest reported zero activity.
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: since },
      },
    },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const total = rows.reduce((s: number, r: any) => s + r.count, 0);

  const breakdown = rows
    .map((r: any) => `• ${r._id || "Uncategorized"}: ${r.count}`)
    .join("\n") || "• (no activity)";

  const label = windowDays === 1 ? "day" : `${windowDays} days`;
  return `*Mail Replyer digest (last ${label}):* ${total} emails processed\n${breakdown}`;
}

export default function startDigestWorker(workerOptions: WorkerOptions) {
  const worker = new Worker(
    digestQueue.name,
    async () => {
      // Fire once per hour: iterate users with digest enabled and post if
      // enough time has passed since their last digest window.
      const users = await UserModel.find({
        "notifications.digestEnabled": true,
        "notifications.slackWebhookUrl": { $exists: true, $ne: "" },
      }).lean();

      for (const user of users) {
        const cadence = user.notifications?.digestCadence || "weekly";
        const windowDays = cadence === "daily" ? 1 : 7;

        // Naive scheduling: only fire when UTC hour is 0 and (daily OR day-of-week=Monday).
        const now = new Date();
        if (now.getUTCHours() !== 0) continue;
        if (cadence === "weekly" && now.getUTCDay() !== 1) continue;

        try {
          const text = await buildDigestFor(user._id.toString(), windowDays);
          await sendDigest(user._id.toString(), text);
        } catch (err) {
          logger.warn({ err, userId: user._id }, "Digest send failed");
        }
      }
    },
    workerOptions
  );

  digestQueue
    .add(
      "hourlyDigestTick",
      {},
      {
        repeat: { every: HOUR_MS },
        jobId: "digestTick",
      }
    )
    .catch((err) => logger.error({ err }, "Failed to schedule digest tick"));

  worker.on("failed", (job, err) =>
    logger.error({ err, jobId: job?.id }, "Digest job failed")
  );
  return worker;
}
