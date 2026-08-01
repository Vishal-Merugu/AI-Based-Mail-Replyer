import { Worker, WorkerOptions } from "bullmq";

import { watchQueue } from "../queue";
import MailMetaModel from "../models/mailMeta";
import { establishWatch } from "./gmailService";
import { logger } from "../utils/logger";

const HOUR_MS = 60 * 60 * 1000;

// Gmail watches last ~7 days. Renew anything expiring inside this window so
// there is ample slack for retries before a subscription actually lapses.
const RENEW_WITHIN_MS = 48 * HOUR_MS;

export async function renewExpiringWatches(): Promise<{
  renewed: number;
  failed: number;
}> {
  const cutoff = new Date(Date.now() + RENEW_WITHIN_MS);

  // Includes accounts with no recorded expiration — those predate watch
  // tracking and are assumed stale.
  const accounts = await MailMetaModel.find({
    access_token: { $exists: true, $ne: null },
    $or: [
      { watchExpiration: { $lte: cutoff } },
      { watchExpiration: { $exists: false } },
      { watchExpiration: null },
    ],
  });

  let renewed = 0;
  let failed = 0;

  for (const account of accounts) {
    try {
      const { expiration } = await establishWatch(
        {
          access_token: account.access_token ?? undefined,
          refresh_token: account.refresh_token ?? undefined,
          id_token: account.id_token ?? undefined,
        },
        account.emailID
      );

      await MailMetaModel.updateOne(
        { _id: account._id },
        { watchExpiration: expiration ?? null }
      );
      renewed++;
      logger.info(
        { emailID: account.emailID, expiration },
        "Renewed Gmail watch"
      );
    } catch (err: any) {
      failed++;
      // A revoked/expired grant lands here. Keep going — one dead account
      // must not stop the rest from being renewed.
      logger.error(
        { err: err?.message, emailID: account.emailID },
        "Failed to renew Gmail watch"
      );
    }
  }

  return { renewed, failed };
}

export default function startWatchRenewalWorker(
  workerOptions: WorkerOptions
) {
  const worker = new Worker(
    watchQueue.name,
    async () => {
      const { renewed, failed } = await renewExpiringWatches();
      logger.info({ renewed, failed }, "Gmail watch renewal sweep complete");
    },
    workerOptions
  );

  // Daily at 03:00 UTC. A cron pattern (rather than `every`) keeps the run
  // time stable across process restarts.
  watchQueue
    .add(
      "renewWatches",
      {},
      {
        repeat: { pattern: "0 3 * * *" },
        jobId: "watchRenewalTick",
      }
    )
    .catch((err) =>
      logger.error({ err }, "Failed to schedule Gmail watch renewal")
    );

  worker.on("failed", (job, err) =>
    logger.error({ err, jobId: job?.id }, "Watch renewal job failed")
  );

  return worker;
}
