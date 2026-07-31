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

export const handleEmailAuth = async (req: Request, res: Response) => {
  try {
    const emailId = req.params.emailId;
    const url = generateGmailOAuthUrl({ emailId: emailId });
    res.redirect(url);
  } catch (err: any) {
    logger.error({ err }, "Error at /email controller");
    res.status(500).send("Internal Server Error");
  }
};

export const handleRedirect = async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    const tokens = await exchangeCodeForToken(code as string);

    if (!tokens || !tokens.access_token || !tokens.refresh_token)
      throw Error("Unable to retrieve token or token Data insufficient");

    const profileInfo = await getProfileInfo(tokens.access_token);

    await MailMetaModel.findOneAndUpdate(
      {
        emailID: profileInfo?.email,
      },
      {
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
