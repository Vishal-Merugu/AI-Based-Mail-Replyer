import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";

import ENV from "../utils/validateEnv";
import { logger } from "../utils/logger";

// Reused across requests deliberately: this client holds no per-user
// credentials, it only fetches and caches Google's public signing certs.
const verifierClient = new OAuth2Client();

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Authenticates Google Cloud Pub/Sub push requests.
 *
 * Without this, /getMessage is an open endpoint: anyone can POST a crafted
 * payload naming an arbitrary connected mailbox and force the worker to
 * fetch mail, spend LLM budget and send replies for it.
 *
 * Preferred mode is an OIDC bearer token signed by Google (configure an
 * "Authentication" service account + audience on the push subscription).
 * A shared-secret query token is supported as a fallback for setups that
 * cannot use OIDC.
 */
export async function verifyPubSubPush(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // --- Mode 1: Google-signed OIDC token (preferred) ---
  if (ENV.PUBSUB_AUDIENCE) {
    const header = req.headers.authorization;
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      logger.warn("Pub/Sub push rejected: missing bearer token");
      res.status(401).send({ message: "Unauthorized" });
      return;
    }

    try {
      const ticket = await verifierClient.verifyIdToken({
        idToken: header.slice(7).trim(),
        audience: ENV.PUBSUB_AUDIENCE,
      });
      const payload = ticket.getPayload();

      if (!payload) throw new Error("Empty OIDC payload");

      const issuerOk =
        payload.iss === "https://accounts.google.com" ||
        payload.iss === "accounts.google.com";
      if (!issuerOk) throw new Error(`Unexpected issuer: ${payload.iss}`);

      if (
        ENV.PUBSUB_SERVICE_ACCOUNT_EMAIL &&
        payload.email !== ENV.PUBSUB_SERVICE_ACCOUNT_EMAIL
      ) {
        throw new Error(`Unexpected service account: ${payload.email}`);
      }

      next();
      return;
    } catch (err: any) {
      logger.warn(
        { err: err?.message },
        "Pub/Sub push rejected: OIDC verification failed"
      );
      res.status(401).send({ message: "Unauthorized" });
      return;
    }
  }

  // --- Mode 2: shared-secret query token (fallback) ---
  if (ENV.PUBSUB_VERIFICATION_TOKEN) {
    const supplied = String(req.query.token || "");
    if (supplied && timingSafeEqual(supplied, ENV.PUBSUB_VERIFICATION_TOKEN)) {
      next();
      return;
    }
    logger.warn("Pub/Sub push rejected: bad verification token");
    res.status(401).send({ message: "Unauthorized" });
    return;
  }

  // --- Unconfigured ---
  if (ENV.isProduction) {
    logger.error(
      "Pub/Sub push endpoint is unauthenticated and NODE_ENV=production — " +
        "refusing request. Set PUBSUB_AUDIENCE or PUBSUB_VERIFICATION_TOKEN."
    );
    res.status(401).send({ message: "Unauthorized" });
    return;
  }

  logger.warn(
    "Pub/Sub push endpoint is UNAUTHENTICATED (development only). " +
      "Set PUBSUB_AUDIENCE or PUBSUB_VERIFICATION_TOKEN before deploying."
  );
  next();
}
