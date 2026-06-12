# Project Status

> Daily working log for the Communication Service. Update at the end of each session.

**Last updated:** 2026-06-12
**Phase:** 2 — Templates, Scheduling & Webhooks

---

## Where we are

The monorepo skeleton is in place and the core send pipeline is implemented end-to-end:

```
Client → API (X-API-Key) → PostgreSQL (message row) → BullMQ queue → Worker → Provider → status update
```

### Done ✅

| Area | State |
|---|---|
| Monorepo | pnpm workspaces — `apps/{api,dashboard,worker}`, `packages/{types,shared,utils}` |
| Infrastructure | `docker-compose.yml` — Postgres 17 (port **5433**) + Redis 7 (port 6379) |
| API: send endpoint | `POST /api/v1/messages/send` — validates DTO, persists message, enqueues per-channel job (3 attempts, exponential backoff) |
| API: status endpoint | `GET /api/v1/messages/:id` — full lifecycle timestamps + error message |
| API: provider status | `GET /api/v1/providers/status` — SMTP verify + queue depths + WhatsApp status from Redis |
| API: health | `GET /api/v1/health` |
| API key auth | `ApiKeyGuard` — SHA-256 hashed keys, `isActive` check, `lastUsedAt` tracking |
| Rate limiting | Global throttler (200/min per IP) + per-API-key message budget on send/send-bulk (`rate_limit_per_minute` column, null → `API_KEY_RATE_LIMIT_PER_MINUTE` env default 60; bulk costs its recipient count; 429 + `Retry-After`) |
| Worker: email | Nodemailer SMTP processor, status transitions (queued → processing → sent/failed) |
| Worker: WhatsApp | `whatsapp-web.js` with LocalAuth session persistence, QR login via terminal, reconnect events |
| WhatsApp session | Logged in — session persisted under `apps/worker/sessions/` (gitignored) |
| Seed script | `pnpm --filter @communication/api seed` — generates a `cs_…` API key (run `db:migrate` first) |
| Migrations | `InitialSchema` + `CreateUsers` in `apps/api/src/database/migrations/`; dev DB baselined; `synchronize` disabled everywhere |
| JWT auth | `POST /api/v1/auth/login` (argon2 + JWT, 12h expiry) and `GET /api/v1/auth/me`; `JwtAuthGuard` ready for dashboard endpoints; admin user seeded |
| Messages list | `GET /api/v1/messages` (JWT, paginated, filter by status/channel, newest first) |
| Dashboard v1 | Login page + dashboard: provider status cards (SMTP/WhatsApp + queue depths), recent-messages table, 10s auto-refresh, 401 → redirect to login |
| DLQ | `GET /dlq`, `POST /dlq/:channel/:jobId/retry`, `POST /dlq/:channel/retry-all`, `DELETE /dlq/:channel/:jobId` (JWT); dashboard panel with retry/discard buttons (appears when jobs are failed) |
| WhatsApp QR in dashboard | Worker publishes QR to Redis (`whatsapp:qr`, 60s TTL, cleared on connect); `GET /api/v1/providers/whatsapp/qr` (JWT-only); dashboard shows a scan-to-link panel whenever a QR is pending |
| Templates (Phase 2) | `templates` table + CRUD at `/api/v1/templates` (API key or JWT); send accepts `templateId` + `variables`, renders `{{placeholders}}` server-side (strict — missing variables → 400), stores rendered body + `template_id` on the message row |
| Scheduled/delayed (Phase 2) | Send accepts `sendAt` (ISO datetime) or `delaySeconds` (mutually exclusive, max 30 days) → BullMQ `delay`; new `scheduled` status + `scheduled_at` column; status flips to processing/sent when the job fires; purple badge in dashboard |
| Bulk messaging (Phase 2) | `POST /api/v1/messages/send-bulk` — up to 100 recipients, per-recipient template variables, all rendered before anything persists (one bad recipient → 400, nothing queued); shared `batch_id` (indexed), `GET /messages?batchId=` filter; 10 calls/min |
| Webhooks (Phase 2) | `webhooks` table + CRUD at `/api/v1/webhooks` (API key or JWT); worker dispatches `message.sent`/`message.failed` through a `webhooks` BullMQ queue — one delivery job per subscribed endpoint, HMAC-SHA256 signed (`X-Webhook-Signature: sha256=…` with the `whsec_…` secret), 10s timeout, 3 retries, failures land in the DLQ (third channel in `/dlq` + dashboard) |
| Swagger | http://localhost:3001/api |
| Env | `.env` files present at root, `apps/api`, `apps/worker` (SMTP + WhatsApp configured) |

### In progress / known gaps 🔧

- **WhatsApp status bridge** — `ProvidersService.getWhatsAppStatus()` reads the `whatsapp:status` key from Redis, but the worker never writes it, so the endpoint always reports `unknown`. *(Being fixed today.)*
- **Dashboard** — v1 + DLQ panel + WhatsApp QR done. Still missing: pagination/filters UI, template/webhook management UI.
- **Don't run `pnpm build` while `pnpm dev` is running** — `next build` clobbers the dev server's `.next` dir and breaks it until restart. Build only api/worker (`pnpm --filter @communication/api build`) when the stack is up.
- **Duplicate Message entity** — `apps/worker/src/database/entities/message.entity.ts` is a copy of the API's; should move to `packages/shared` eventually.
(Verified: the `messages` entity already carries the nullable `tenant_id` column required by the Phase 3 design note.)

---

## Daily log

### 2026-06-10
- Scaffolded the pnpm monorepo (API, worker, dashboard, shared packages).
- Implemented full send pipeline: messages module, API-key guard, per-channel BullMQ queues, email + WhatsApp processors with retry/backoff and lifecycle status updates in Postgres.
- Set up Docker Compose (Postgres on 5433, Redis 6379), root and per-app `.env`s.
- Logged in to WhatsApp (QR) — session persisted.
- Added seed script for API keys, Swagger docs.

### 2026-06-11
- Reviewed project docs (README, Roadmap, start guide) and audited code vs. Phase 1 scope.
- Created this STATUS.md.
- Fixed WhatsApp status bridge: worker now publishes `whatsapp:status` to Redis (on every state change + 30s heartbeat with TTL), so `GET /api/v1/providers/status` reports real connection state.
- Debugged WhatsApp "couldn't link device": caused by duplicate worker instances fighting over the session dir; killed strays, wiped dead session (backup at `/tmp/whatsapp-session-backup-20260611`).
- Fixed `pnpm dev` errors: dashboard `ENOSPC` watcher flood (workaround: `WATCHPACK_POLLING=true` in dashboard dev script; permanent fix needs `sudo sysctl fs.inotify.max_user_watches=524288`) and port-3001 collisions from stale processes.
- **Migrations are now real**: generated `InitialSchema` migration (both tables + indexes on `messages.status`/`created_at`), verified run/revert round-trip on a shadow DB, baselined the dev DB, and disabled `synchronize` everywhere (API, worker, seed). Schema changes now require `pnpm --filter @communication/api db:migration:generate` + `pnpm db:migrate`.
- **Git**: initialized repo (branch `main`), first commit pushed to https://github.com/basil51/communicat.git. Secrets (`.env`) and WhatsApp sessions verified ignored.
- **JWT auth implemented**: `users` table (migration `CreateUsers`), `AuthService` with argon2 password verify (timing-safe on unknown emails), `POST /auth/login` (throttled 10/min) returning a 12h JWT, `GET /auth/me`, hand-rolled `JwtAuthGuard` (same style as `ApiKeyGuard`). Seed script now also creates an admin user (`admin@sparkco.local`, password printed once — see terminal or re-seed with `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`). Verified live: login → token → `/auth/me`, plus 401 paths.
- **Dashboard v1 shipped**: API side — `GET /messages` (JWT, paginated/filterable), `ApiKeyOrJwtGuard` on `/providers/status` (accepts either auth), CORS enabled for `DASHBOARD_ORIGIN`. Dashboard side — `/login` page (stores JWT in localStorage), main page with provider status cards + queue depths + recent-messages table, auto-refresh every 10s, auto-redirect to login on 401. Verified: API endpoints via curl (real data — 3 sent emails in the log), CORS preflight 204, both pages render. `.env.example` updated (5433 port fix, JWT_EXPIRES_IN, SEED_*, DASHBOARD_ORIGIN). Login verified working by Basel; credentials documented in start.md.
- **DLQ shipped**: `DlqModule` (list/retry/retry-all/discard, JWT-guarded) + red dashboard panel with per-job Retry/Discard and per-channel Retry-all. End-to-end tested live: sent WhatsApp to an invalid number → 3 attempts → landed in DLQ → retried via API (re-failed, attempts 3→4) → discarded → DLQ empty. WhatsApp relinked successfully today (status `connected`).
- **Processor error capture fixed**: both processors now store `err?.message ?? String(err)` instead of `err.message`.
- **WhatsApp QR in dashboard shipped**: worker publishes the pairing QR to Redis (`whatsapp:qr`, 60s TTL, cleared on ready/auth_failure/disconnected/shutdown), `GET /providers/whatsapp/qr` (JWT-only — API keys must not be able to pair a device), dashboard renders an amber scan-to-link panel (`qrcode.react`) whenever a QR is pending. Verified live: API booted from the new build, JWT fetch returns `{"qr":null}`, no auth → 401, fake QR set in Redis round-trips through the endpoint. Worker QR publishing not yet live — the running worker predates this build (see gaps).
- **Committed** everything since the initial commit (migrations, JWT auth, dashboard, DLQ). Removed the admin password from start.md first — verified it was never in any pushed commit, so no rotation needed (start.md now points to `SEED_*` env vars / seed output instead). Scanned the full diff for secrets: clean; `.env`s and WhatsApp sessions confirmed ignored. **Push pending**: no working GitHub credentials in the terminal — `~/.ssh/id_ed25519_github` is not registered with the GitHub account (`Permission denied (publickey)`), no `gh` CLI, no credential helper. Push from VSCode's Source Control, or add the public key to GitHub and `git remote set-url origin git@github.com:basil51/communicat.git`.

---

### 2026-06-12
- Basel pushed `main` to GitHub (both pending commits) from VSCode.
- Killed the stale duplicate worker from yesterday (pid 1305108, old build) — only the `pnpm dev` worker remains, running the QR-publishing build. WhatsApp status: `connected`, no QR pending (correct).
- **Phase 2 kickoff — message templates shipped**: `Template` entity + `CreateTemplates` migration (also adds `messages.template_id`), `TemplatesModule` with full CRUD at `/api/v1/templates` (ApiKeyOrJwtGuard, 409 on duplicate names), send endpoint now takes `templateId` + `variables` and renders `{{placeholders}}` server-side before persisting/queueing (worker untouched — it only ever sees rendered text). Strict rendering: any placeholder without a value → 400 listing the missing keys; channel mismatch and message+templateId both → 400. Verified live end-to-end: created `order-confirmation` template, sent a real templated email to basel51@gmail.com (status `sent`, rendered subject/body + `template_id` confirmed in DB), all error paths, PATCH/DELETE/409/401. Test API key from seeding deactivated afterwards.
- **Bulk messaging shipped**: `POST /messages/send-bulk` (max 100 recipients, per-recipient variables merged over shared ones, combinable with templates + scheduling). Atomic validation: everything renders before anything persists. Batch grouped by indexed `batch_id` (`AddBatchId` migration), filterable via `GET /messages?batchId=`. Verified live: 2-recipient templated batch → both rendered per-recipient and `sent`; bad recipient → 400 naming it, zero rows queued.
- **Webhooks shipped**: `webhooks` table (`CreateWebhooks` migration) + CRUD; secret (`whsec_…`) generated server-side. Worker-side `WebhookDispatcherService` fans `message.sent`/`message.failed` out into per-endpoint delivery jobs on a new `webhooks` queue; `WebhookProcessor` POSTs JSON with `X-Webhook-Event` + `X-Webhook-Signature: sha256=<HMAC-SHA256 of body>`, 10s timeout, 3 attempts; webhook problems never fail the message job. DLQ extended to a third `webhooks` channel (API + dashboard; retry skips message-status updates). Verified live: local receiver got `message.sent` with a **valid HMAC**, dead-endpoint delivery retried 3× → DLQ → discarded. Test webhooks/key cleaned up.
- **Recurring stray-worker problem hit again**: `nest start --watch` leaves orphaned `node dist/main` worker processes behind on restarts (found 4 strays competing for queue jobs — an old one swallowed the first webhook test). Killed them; see gaps.
- **WhatsApp send verified live to a real number**: test message to Basel's +972515622300 → `sent` in ~250 ms, received on the phone. (The lone `failed` WhatsApp row in the dashboard is the *deliberate* invalid-number DLQ test from 2026-06-11, not a channel problem.) Seeded a fresh API key for this; it's still active for further WhatsApp testing.
- **Scheduled + delayed messages shipped**: `sendAt` (ISO 8601) or `delaySeconds` on the send endpoint (mutually exclusive; both capped at 30 days; past `sendAt` → 400) map to BullMQ's `delay` option. New `scheduled` message status (`@communication/types` union extended) + `scheduled_at` column (`AddScheduledAt` migration); response returns `{status:"scheduled", scheduledAt}`. Dashboard shows scheduled messages with a purple badge. Verified live: 15s-delayed templated email — status `scheduled` immediately, worker picked it up 150ms after the scheduled time, `sent` confirmed; all three 400 paths tested. Also removed stale build artifacts (`index.js`/`index.d.ts`) from `packages/types/src/` that would have shadowed type changes.

- Basel pushed the remaining Phase 2 commits to GitHub from VSCode (`main` in sync with origin). Terminal push still blocked (SSH key not registered with GitHub).
- **Stray-worker bug fixed (root cause)**: on watch restarts the nest CLI tree-kills its `sh -c node dist/main` child, but puppeteer (whatsapp-web.js) installs SIGTERM/SIGINT listeners that disable Node's default exit-on-signal — the old worker survived and competed for queue jobs/the WhatsApp session. Fix: explicit SIGTERM/SIGINT handler in worker `main.ts` (closes the app, force-exits after 8s deadline) + dev script now sweeps strays (`pkill -f 'worker/dist/main$'`, `$`-anchored so it can't kill its own wrapper shell) before starting the watcher. Verified live: two consecutive watch restarts each left exactly one worker, WhatsApp reconnected (`connected`) after.

- **Per-key rate limits shipped (last Phase 1 leftover)**: `rate_limit_per_minute` column on `api_keys` (`AddApiKeyRateLimit` migration; null → `API_KEY_RATE_LIMIT_PER_MINUTE` env default 60) enforced by `ApiKeyRateLimitGuard` — fixed 1-minute Redis window (`INCRBY`, key TTL 2×window), runs after `ApiKeyGuard` on send + send-bulk, counts *messages* (bulk costs its recipient count, clamped to 100), 429 with `Retry-After` header. Replaced the old per-IP route `@Throttle`s (global 200/min/IP backstop remains). Note: BullMQ ≥5.78 types `queue.client` as a narrow `IRedisClient` — its runtime proxy still forwards `incrby`/`expire` to ioredis, hence the local cast in the guard. Verified live with a 3/min key: 3 requests passed then 429 (`Retry-After: 9`), and a 5-recipient bulk on a fresh window 429'd immediately; test limits reset to NULL after.

---

## Next up (priority order)

**Phase 2 is feature-complete** (templates, scheduled/delayed, bulk, webhooks), and per-key rate limits closed out Phase 1.

1. Dashboard: template/webhook management UI; pagination/filters for the messages table.
2. Decide on `delivered` tracking: Roadmap (Phase 1 lifecycle + Phase 2 webhooks) mentions a `delivered` status, but nothing implements it (WhatsApp would need message-ack listeners; SMTP can't really support it). Build for WhatsApp or drop from scope.
3. Phase 3 kickoff: multi-tenant (tenants table, scoped API keys, row-level isolation on the existing `tenant_id` columns).
