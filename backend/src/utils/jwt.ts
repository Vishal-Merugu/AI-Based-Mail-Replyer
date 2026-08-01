import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import ENV from "./validateEnv";

export type JwtPayload = {
  userId: string;
  email: string;
};

/**
 * Tokens are scoped by audience so they cannot be swapped for one another.
 *
 * This matters because the OAuth `state` token travels through Google's
 * servers, the browser URL bar, Referer headers and access logs. Previously
 * it was minted by the same function, key and payload shape as the session
 * token, so anyone who observed a `state` value held a full-session
 * credential. The `aud` claim makes that substitution fail verification.
 */
const AUDIENCE = {
  session: "mail-replyer:session",
  oauthState: "mail-replyer:oauth-state",
} as const;

const ALGORITHM = "HS256" as const;

// The state token only has to survive a single consent round-trip.
const OAUTH_STATE_TTL = "10m";

function sign(
  payload: JwtPayload,
  audience: string,
  expiresIn: SignOptions["expiresIn"]
): string {
  const options: SignOptions = {
    algorithm: ALGORITHM,
    audience,
    expiresIn,
  };
  return jwt.sign(payload, ENV.JWT_SECRET, options);
}

function verify(token: string, audience: string): JwtPayload {
  const options: VerifyOptions = {
    // Pin the algorithm rather than accepting whatever the token declares.
    algorithms: [ALGORITHM],
    audience,
  };
  return jwt.verify(token, ENV.JWT_SECRET, options) as JwtPayload;
}

export function signSessionToken(payload: JwtPayload): string {
  return sign(
    payload,
    AUDIENCE.session,
    ENV.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  );
}

export function verifySessionToken(token: string): JwtPayload {
  return verify(token, AUDIENCE.session);
}

export function signOAuthStateToken(payload: JwtPayload): string {
  return sign(payload, AUDIENCE.oauthState, OAUTH_STATE_TTL);
}

export function verifyOAuthStateToken(token: string): JwtPayload {
  return verify(token, AUDIENCE.oauthState);
}
