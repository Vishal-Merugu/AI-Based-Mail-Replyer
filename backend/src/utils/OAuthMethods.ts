import { GoogleApis, gmail_v1, oauth2_v2 } from "googleapis";
import { GaxiosPromise } from "gaxios";
import { Credentials } from "../../node_modules/google-auth-library/build/src/auth/credentials";

import ENV from "./validateEnv";

const google = new GoogleApis();
const googleOAuth2 = google.auth.OAuth2;
const gmail = google.gmail("v1");

const oauth2Client = new googleOAuth2(
  ENV.GOOGLE_CLIENT_ID,
  ENV.GOOGLE_CLIENT_SECRET,
  ENV.GOOGLE_REDIRECT_URI
);

const scopes = [
  "email",
  "profile",
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/plus.login",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export function generateGmailOAuthUrl({
  emailId,
}: {
  emailId: string;
}): string {
  let login_hint;

  if (emailId) login_hint = emailId;

  let url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    login_hint: login_hint,
  });
  return url;
}

export async function exchangeCodeForToken(code: string): Promise<Credentials> {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function establishWatcher(
  access_token: string
): GaxiosPromise<gmail_v1.Schema$WatchResponse> {
  oauth2Client.setCredentials({ access_token });

  return gmail.users.watch({
    userId: "ME",
    requestBody: {
      labelIds: ["INBOX"],
      topicName: ENV.GC_TOPIC_NAME,
    },
    auth: oauth2Client,
  });
}

export const getProfileInfo = (
  access_token: string
): Promise<oauth2_v2.Schema$Userinfo | undefined> => {
  return new Promise((resolve, reject) => {
    const oauth2Client = new googleOAuth2();
    oauth2Client.setCredentials({ access_token });

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });
    oauth2.userinfo.get(function (err, res) {
      return resolve(res?.data);
    });
  });
};
