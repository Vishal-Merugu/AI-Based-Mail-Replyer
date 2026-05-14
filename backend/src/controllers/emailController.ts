import { Request, Response } from "express";
import {
  establishWatcher,
  exchangeCodeForToken,
  generateGmailOAuthUrl,
  getProfileInfo,
} from "../utils/OAuthMethods";
import { emailQueue } from "../queue";
import MailMetaModel from "../models/mailMeta";
import { readRequestBody } from "../utils/misc";

export const handleEmailAuth = async (req: Request, res: Response) => {
  try {
    const emailId = req.params.emailId;
    const url = generateGmailOAuthUrl({ emailId: emailId });
    res.redirect(url);
  } catch (err: any) {
    console.log("ERROR AT /email controller", err.toString());
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
    console.error("Error during OAuth redirect:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const getMessage = async (req: Request, res: Response) => {
  try {
    const body = await readRequestBody(req);
    req.body = body;

    await emailQueue.add("sendEmailJob", body);

    res.status(200).send({ message: "Message received successfully" });
  } catch (err: any) {
    console.log("ERROR IN /getMessage Controller", err.toString());
    res.status(200).send();
  }
};
