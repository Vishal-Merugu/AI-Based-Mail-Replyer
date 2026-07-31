# Fix Checklist

Tracking doc for cleanup/fix pass on this repo. Check items off as they land; each item should be its own commit.

## Priority 1 — Core pipeline is non-functional

- [x] Fix `getMessage`/`readRequestBody` double body-read bug (`backend/src/controllers/emailController.ts`, `backend/src/utils/misc.ts`) — the Pub/Sub push body is consumed by `express.json()` then re-read manually, so it always ends up empty. Decode the Pub/Sub envelope (`message.data`, base64) properly.
- [x] Load env vars: add `dotenv.config()` at process entry points (`server.ts`, `consumers/index.ts`), commit a `.env.example`.
- [x] Fix `emailWorker.ts` to `return`/`await` the per-message processing so BullMQ completed/failed status reflects reality. (Also isolated per-message errors with try/catch so one bad thread doesn't fail the whole job.)
- [x] Move the self-reply check (`mailObj.From.includes(emailAddress)`) before the Groq API call instead of after.
- [x] Add a `start` script (and a script to launch `consumers/index.ts`) to `backend/package.json` — nothing currently runs the worker. (Also added `dev`/`dev:worker` nodemon scripts, using the previously-unused `nodemon` devDependency.)
- [ ] Replace deprecated Groq model `mixtral-8x7b-32768` with a current supported model.

## Priority 2 — Correctness / security hardening

- [x] Dedupe Mongo/Redis connection setup (remove double `mongoose.connect` in `consumers/index.ts`; share one Redis connection config instead of two hardcoded, inconsistent copies).
- [ ] Persist refreshed OAuth tokens back to `MailMetaModel` instead of only ever using the originally stored `access_token`.
- [ ] Add CORS middleware to the Express app for the separate React client.
- [ ] Stop storing OAuth access/refresh tokens in plaintext in Mongo — encrypt at rest.

## Priority 3 — Frontend

- [ ] Replace placeholder routes (`<div>Hello1</div>` / `<div>Hello2</div>`) with real pages.
- [ ] Remove hardcoded developer email/URL in "Connect Gmail" button; make it configurable (env-based API base URL, user-entered email).
- [ ] Add a basic dashboard showing connected accounts / processed email activity.

## Priority 4 — Style / patterns (cosmetic, do last)

- [ ] Stop importing from package internals (`node_modules/google-auth-library/build/...`, `envalid/dist/validators`) — use public exports.
- [x] Fix parameter shadowing a type name in `startEmailWorker(QueueBaseOptions?: QueueBaseOptions)`.
- [ ] Standardize on async/await (remove manual `Promise.resolve()/reject()` mixed in async-style code).
- [ ] Fix naming typos (`setCredentialsForoAuth`, `createLabelorGetExisting`) and rename `consumers/utils.ts` to reflect it's a Gmail service layer, not generic utils.
- [ ] Replace scattered `console.log`/`console.error` with a structured logger.
