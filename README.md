# AI-Based Mail Replyer

Connect a Gmail account and an LLM classifies incoming mail and drafts a reply
on your behalf — either sent automatically or held for your review.

Node.js/Express + React + BullMQ + MongoDB + Groq.

## Trust model — read this first

**Every input to this system is attacker-controlled.** Anyone who knows your
address can put text into the model's prompt and influence mail sent under
your name. The controls that matter:

- The LLM's category is **validated against your configured list** — it cannot
  invent one (that value creates a Gmail label).
- Untrusted content is fenced with a per-call nonce and the model is told it is
  data, not instructions. This reduces prompt-injection risk; it does not
  eliminate it.
- **Review mode** (per account) holds every draft for approval before sending.
  Turn it on if unattended sending is not acceptable for that mailbox.
- Auto-replies are suppressed for bulk mail, mailing lists, bounces and other
  auto-responders (RFC 3834), with a per-contact rate cap as a backstop.

## Architecture

| Piece | Role |
|---|---|
| `backend/` (Express) | Auth, Gmail OAuth, Pub/Sub push intake, REST API |
| `backend/src/consumers/` | BullMQ workers: email processing, follow-ups, digests, Gmail watch renewal |
| `backend/src/services/` | Groq client, rule engine, auto-reply policy, quota, notifications |
| `client/` (React + MUI) | Dashboard, Outbox, rules, analytics, memory, billing |

Flow: Gmail → Pub/Sub push → `POST /getMessage` → `emailQueue` → worker →
rules → quota → Groq → label + send (or park in the Outbox).

## Features

- **Multi-user accounts** — email/password auth (JWT), all data scoped per user
- **Gmail integration** — OAuth, push notifications, auto-renewing watch
- **Reply personas** — per-account voice, tone, signature, extra instructions
- **Review mode** — Outbox to edit/approve/reject drafts before they send
- **Custom categories & routing rules** — templates, skip-reply, force-category
- **Follow-up sequences** — cadence + max attempts, auto-cancelled on reply
- **Thread context & contact memory** — prior turns and your notes feed the model
- **Attachments** — PDF text extracted into the model's context
- **Analytics** — volume over time, category breakdown, per-account totals
- **Notifications & digests** — Slack webhook on Interested/failures, daily/weekly digest
- **Billing & quotas** — free/pro plans, monthly reply allowance, Stripe checkout

## Prerequisites

- Node.js & npm
- MongoDB
- Redis
- Google Cloud project: Gmail API enabled, OAuth client, Pub/Sub topic +
  **authenticated** push subscription
- Groq API key
- Stripe account (optional — omit and the app runs free-plan only)

## Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env   # then fill it in — see below
npm run build
npm start              # API
npm run worker         # background workers (separate process)

# Frontend
cd client
npm install
cp .env.example .env
npm start
```

`npm run dev` / `npm run dev:worker` run the same two processes with reload.

### Required configuration

Everything is validated at boot — a missing or malformed value fails fast
rather than surfacing later as odd behaviour. See `backend/.env.example` for
the full list. The ones that need real thought:

| Variable | Why it matters |
|---|---|
| `JWT_SECRET` | Signs sessions. `openssl rand -hex 32` |
| `TOKEN_ENCRYPTION_KEY` | Encrypts Gmail tokens at rest. Exactly 64 hex chars |
| `PUBSUB_AUDIENCE` *or* `PUBSUB_VERIFICATION_TOKEN` | **Required in production.** The push endpoint can enqueue work for any connected mailbox, so it refuses traffic when unauthenticated |
| `EMAIL_WORKER_CONCURRENCY` | Messages in parallel per worker (default 5). Same-mailbox jobs are serialized by a Redis lock regardless |

## Operational notes

- **Gmail watches expire after ~7 days.** A daily job (03:00 UTC) renews them.
  The worker process must be running or accounts go quiet after a week.
- **Idempotency**: Pub/Sub is at-least-once and jobs retry, so each message is
  claimed via a unique `(userId, gmailMessageId)` index before any send.
- **Health**: `GET /health` reports DB connectivity (200 / 503).
- **Quotas** reset on the 1st of each month (UTC).

## Testing status

There is **no automated test suite yet** — `npm test` is still a stub. Changes
so far have been verified with type-checks, builds, and targeted scripts run
against the built output. Integration coverage against real Gmail/Groq/Mongo/
Redis is the main outstanding gap.

## License

ISC
