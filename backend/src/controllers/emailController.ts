import { Request, Response } from "express";
import {
  establishWatcher,
  exchangeCodeForToken,
  generateGmailOAuthUrl,
  getProfileInfo,
} from "../utils/OAuthMethods";
import { emailQueue } from "../queue";
import MailMetaModel from "../models/mailMeta";
import { decodePubSubMessage } from "../utils/misc";
import { logger } from "../utils/logger";
import { signToken, verifyToken } from "../utils/jwt";

// The OAuth callback lands with just Google's `state` param — no auth header
// available. We piggyback our JWT there to carry the userId through the
// round-trip securely (signed, expires with the token).
function encodeOAuthState(userId: string, email: string): string {
  return signToken({ userId, email });
}

function decodeOAuthState(state: string): { userId: string; email: string } {
  const payload = verifyToken(state);
  return { userId: payload.userId, email: payload.email };
}

export const handleEmailAuth = async (req: Request, res: Response) => {
  try {
    const emailId = req.params.emailId;
    const state = encodeOAuthState(req.user!.userId, req.user!.email);
    const url = generateGmailOAuthUrl({ emailId, state });
    res.redirect(url);
  } catch (err: any) {
    logger.error({ err }, "Error at /email controller");
    res.status(500).send("Internal Server Error");
  }
};

export const handleRedirect = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!state || typeof state !== "string") {
      res.status(400).send("Missing state parameter");
      return;
    }

    let userId: string;
    try {
      ({ userId } = decodeOAuthState(state));
    } catch {
      res.status(400).send("Invalid or expired state parameter");
      return;
    }

    const tokens = await exchangeCodeForToken(code as string);

    if (!tokens || !tokens.access_token || !tokens.refresh_token)
      throw Error("Unable to retrieve token or token Data insufficient");

    const profileInfo = await getProfileInfo(tokens.access_token);

    if (!profileInfo?.email) {
      // Without an address we cannot key the account record — fail loudly
      // rather than upserting a document with an undefined emailID.
      throw Error("Google profile lookup returned no email address");
    }

    await MailMetaModel.findOneAndUpdate(
      {
        userId,
        emailID: profileInfo.email,
      },
      {
        userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: new Date(tokens.expiry_date as number),
        id_token: tokens.id_token,
      },
      {
        upsert: true,
      }
    );

    await establishWatcher(tokens.access_token);

    res.send(`
    <script>
      window.close();
      if (window.opener) {
        window.opener.postMessage('login_success', '*');
      }
    </script>
    `);
  } catch (error) {
    logger.error({ error }, "Error during OAuth redirect");
    res.status(500).send("Internal Server Error");
  }
};

export const getMessage = async (req: Request, res: Response) => {
  try {
    const notification = decodePubSubMessage(req.body);

    if (!notification?.emailAddress) {
      logger.warn("Malformed Pub/Sub push payload in /getMessage controller");
      // Ack anyway so Pub/Sub doesn't keep retrying an unparseable message.
      res.status(200).send();
      return;
    }

    await emailQueue.add("sendEmailJob", notification);

    res.status(200).send({ message: "Message received successfully" });
  } catch (err: any) {
    logger.error({ err }, "Error in /getMessage controller");
    res.status(200).send();
  }
};
