import UserModel from "../models/user";
import UsageMeterModel from "../models/usageMeter";
import ENV from "../utils/validateEnv";

function currentPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function quotaForPlan(plan: string | undefined): number {
  if (plan === "pro") return Number(ENV.PRO_PLAN_QUOTA);
  return Number(ENV.FREE_PLAN_QUOTA);
}

export type UsageInfo = {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  periodStart: Date;
};

export async function getUsage(userId: string): Promise<UsageInfo> {
  const [user, meter] = await Promise.all([
    UserModel.findById(userId, "plan").lean(),
    UsageMeterModel.findOne({
      userId,
      periodStart: currentPeriodStart(),
    }).lean(),
  ]);

  const plan = user?.plan || "free";
  const used = meter?.replyCount || 0;
  const limit = quotaForPlan(plan);
  return {
    plan,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    periodStart: currentPeriodStart(),
  };
}

// Try to atomically increment usage; returns true if it stayed under quota.
export async function tryConsumeReply(userId: string): Promise<boolean> {
  const user = await UserModel.findById(userId, "plan").lean();
  const limit = quotaForPlan(user?.plan);
  const periodStart = currentPeriodStart();

  const result = await UsageMeterModel.findOneAndUpdate(
    {
      userId,
      periodStart,
      replyCount: { $lt: limit },
    },
    { $inc: { replyCount: 1 } },
    { new: true, upsert: false }
  );

  if (result) return true;

  // Nothing to update either means quota reached or the row doesn't exist for
  // this period yet. Create it fresh if missing.
  const existing = await UsageMeterModel.findOne({ userId, periodStart });
  if (!existing) {
    try {
      await UsageMeterModel.create({ userId, periodStart, replyCount: 1 });
      return true;
    } catch {
      // Race: someone else created the row; re-check.
      const now = await UsageMeterModel.findOne({ userId, periodStart });
      if (now && now.replyCount < limit) {
        await UsageMeterModel.updateOne(
          { _id: now._id },
          { $inc: { replyCount: 1 } }
        );
        return true;
      }
    }
  }

  return false;
}
