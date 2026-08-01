/**
 * Decides whether an incoming message may be auto-replied to.
 *
 * An auto-responder that replies to anything is how mail loops start: two
 * responders ping-pong forever, a mailing list gets blasted, or a bounce
 * triggers a reply that bounces again. Beyond burning quota and LLM spend,
 * that reliably gets a sending domain rate-limited or blacklisted.
 *
 * Rules follow RFC 3834 ("Recommendations for Automatic Responses to
 * Electronic Mail") plus the widely-honoured de-facto headers.
 */

export type ReplyCandidateHeaders = {
  From: string;
  "Auto-Submitted"?: string;
  Precedence?: string;
  "List-Id"?: string;
  "List-Unsubscribe"?: string;
  "Return-Path"?: string;
  "X-Auto-Response-Suppress"?: string;
};

export type SuppressionReason =
  | "auto-submitted"
  | "bulk-precedence"
  | "mailing-list"
  | "response-suppressed"
  | "bounce"
  | "no-reply-sender"
  | "self";

/** Local-parts that indicate a bounce / delivery-status notification. */
const BOUNCE_LOCALPARTS = [
  "mailer-daemon",
  "postmaster",
  "bounce",
  "bounces",
];

/** Local-parts that conventionally must never receive a reply. */
const NO_REPLY_LOCALPARTS = [
  "no-reply",
  "noreply",
  "do-not-reply",
  "donotreply",
];

const BULK_PRECEDENCE = ["bulk", "list", "junk", "auto_reply"];

export function extractAddress(headerValue: string): string {
  const m = headerValue?.match(/<([^>]+)>/);
  return (m ? m[1] : headerValue || "").trim().toLowerCase();
}

/**
 * Returns a reason to suppress the auto-reply, or null when replying is fine.
 */
export function suppressionReason(
  headers: ReplyCandidateHeaders,
  ownAddress: string
): SuppressionReason | null {
  const from = extractAddress(headers.From);
  const own = ownAddress.trim().toLowerCase();

  // Never reply to ourselves — the tightest possible loop.
  if (from && own && from === own) return "self";

  // RFC 3834: any value other than "no" means the message was generated
  // automatically and must not be auto-replied to.
  const autoSubmitted = headers["Auto-Submitted"]?.trim().toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") return "auto-submitted";

  const precedence = headers.Precedence?.trim().toLowerCase();
  if (precedence && BULK_PRECEDENCE.includes(precedence)) {
    return "bulk-precedence";
  }

  // Mailing list traffic — replying blasts every subscriber.
  if (headers["List-Id"] || headers["List-Unsubscribe"]) return "mailing-list";

  const suppress = headers["X-Auto-Response-Suppress"]?.toLowerCase();
  if (
    suppress &&
    /\b(all|autoreply|oof|dr|rn|nrn)\b/.test(suppress)
  ) {
    return "response-suppressed";
  }

  // An empty Return-Path (<>) is the standard marker of a bounce/DSN.
  const returnPath = headers["Return-Path"]?.trim();
  if (returnPath === "<>" || returnPath === "") return "bounce";

  // Reason accuracy matters here: these end up in logs, and "bounce" vs
  // "no-reply-sender" point at different problems.
  const localPart = from.split("@")[0] ?? "";
  if (BOUNCE_LOCALPARTS.includes(localPart)) return "bounce";
  if (NO_REPLY_LOCALPARTS.includes(localPart)) return "no-reply-sender";

  return null;
}
