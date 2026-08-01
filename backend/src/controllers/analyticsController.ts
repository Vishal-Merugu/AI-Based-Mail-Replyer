import { Request, Response } from "express";
import mongoose from "mongoose";

import ProcessedEmailModel from "../models/processedEmail";
import { logger } from "../utils/logger";

const DAY_MS = 24 * 60 * 60 * 1000;

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 90);
    const since = new Date(Date.now() - days * DAY_MS);
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    const [dailyRaw, categoryRaw, accountRaw] = await Promise.all([
      ProcessedEmailModel.aggregate([
        { $match: { userId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: { date: "$createdAt", format: "%Y-%m-%d" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ProcessedEmailModel.aggregate([
        { $match: { userId, createdAt: { $gte: since } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ProcessedEmailModel.aggregate([
        { $match: { userId, createdAt: { $gte: since } } },
        { $group: { _id: "$emailID", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Fill missing days with 0 so the line chart is continuous.
    const dailyMap = new Map(dailyRaw.map((d: any) => [d._id, d.count]));
    const daily: Array<{ date: string; count: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      daily.push({ date: key, count: (dailyMap.get(key) as number) || 0 });
    }

    res.status(200).send({
      daily,
      categories: categoryRaw.map((c: any) => ({
        category: c._id || "Uncategorized",
        count: c.count,
      })),
      accounts: accountRaw.map((a: any) => ({
        emailID: a._id,
        count: a.count,
      })),
      totals: {
        emailsProcessed: dailyRaw.reduce((sum: number, d: any) => sum + d.count, 0),
        rangeDays: days,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Error in /analytics");
    res.status(500).send({ message: "Internal Server Error" });
  }
};
