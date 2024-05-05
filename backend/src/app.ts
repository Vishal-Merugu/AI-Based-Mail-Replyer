import express, { Request, Response } from "express";

import { logger, readRequestBody } from "./utils/misc";
import {
  establishWatcher,
  exchangeCodeForToken,
  generateGmailOAuthUrl,
  getProfileInfo,
} from "./utils/OAuthMethods";

import { emailQueue } from "./queue";
import MailMetaModel from "./models/mailMeta";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

app.get("/email/:emailId", async (req: Request, res: Response) => {
  try {
    const emailId = req.params.emailId;

    const url = generateGmailOAuthUrl({ emailId: emailId });

    res.redirect(url);
  } catch (err: any) {
    console.log("ERROR AT /email controller", err.toString());
  }
});

app.get("/redirect", async (req, res) => {
  try {
    const { code } = req.query;
    const tokens = await exchangeCodeForToken(code as string);

    if (!tokens || !tokens.access_token || !tokens.refresh_token)
      throw Error("Unable to retrive token or token Data insuffcient");

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
});

app.post("/getMessage", async (req, res) => {
  try {
    const body = await readRequestBody(req);

    req.body = body;

    await emailQueue.add("sendEmailJob", body);

    res.status(200).send({ message: "Message received successfully" });
  } catch (err: any) {
    console.log("ERROR IN /getMessage Controller", err.toString());
    res.status(200).send();
  }
});

export default app;
