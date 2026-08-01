import { GoogleApis, gmail_v1, oauth2_v2 } from "googleapis";
import { GaxiosPromise } from "gaxios";
import { Credentials, OAuth2Client } from "google-auth-library";

import ENV from "./validateEnv";
import { logger } from "./logger";

const google = new GoogleApis();
const gmail = google.gmail("v1");

/**
 * Fresh OAuth2 client per call — `setCredentials`/`getToken` mutate the
 * instance, so sharing one across requests lets concurrent users clobber
 * each other's credentials.
 */
function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    ENV.GOOGLE_CLIENT_ID,
    ENV.GOOGLE_CLIENT_SECRET,
    ENV.GOOGLE_REDIRECT_URI
  );
}

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
  state,
}: {
  emailId: string;
  state?: string;
}): string {
  const oauth2Client = createOAuthClient();

  let login_hint;
  if (emailId) login_hint = emailId;

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    login_hint: login_hint,
    state,
  });
}

export async function exchangeCodeForToken(code: string): Promise<Credentials> {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function establishWatcher(
  access_token: string
): GaxiosPromise<gmail_v1.Schema$WatchResponse> {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({ access_token });

  return gmail.users.watch({
    userId: "me",
    requestBody: {
      labelIds: ["INBOX"],
      topicName: ENV.GC_TOPIC_NAME,
    },
    auth: oauth2Client,
  });
}

export const getProfileInfo = async (
  access_token: string
): Promise<oauth2_v2.Schema$Userinfo | undefined> => {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({ access_token });

  const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });

  try {
    const res = await oauth2.userinfo.get();
    return res.data;
  } catch (err) {
    // Previously this error was silently swallowed, which made a failed
    // profile lookup surface much later as a confusing validation error.
    logger.error({ err }, "Failed to fetch Google profile info");
    throw err;
  }
};
