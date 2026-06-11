# Project Status

> Daily working log for the Communication Service. Update at the end of each session.

**Last updated:** 2026-06-11
**Phase:** 1 — MVP (Email + WhatsApp)

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
| Rate limiting | Global throttler (200/min) + 60/min on send endpoint |
| Worker: email | Nodemailer SMTP processor, status transitions (queued → processing → sent/failed) |
| Worker: WhatsApp | `whatsapp-web.js` with LocalAuth session persistence, QR login via terminal, reconnect events |
| WhatsApp session | Logged in — session persisted under `apps/worker/sessions/` (gitignored) |
| Seed script | `pnpm --filter @communication/api seed` — generates a `cs_…` API key (run `db:migrate` first) |
| Migrations | `InitialSchema` + `CreateUsers` in `apps/api/src/database/migrations/`; dev DB baselined; `synchronize` disabled everywhere |
| JWT auth | `POST /api/v1/auth/login` (argon2 + JWT, 12h expiry) and `GET /api/v1/auth/me`; `JwtAuthGuard` ready for dashboard endpoints; admin user seeded |
| Messages list | `GET /api/v1/messages` (JWT, paginated, filter by status/channel, newest first) |
| Dashboard v1 | Login page + dashboard: provider status cards (SMTP/WhatsApp + queue depths), recent-messages table, 10s auto-refresh, 401 → redirect to login |
| DLQ | `GET /dlq`, `POST /dlq/:channel/:jobId/retry`, `POST /dlq/:channel/retry-all`, `DELETE /dlq/:channel/:jobId` (JWT); dashboard panel with retry/discard buttons (appears when jobs are failed) |
| Swagger | http://localhost:3001/api |
| Env | `.env` files present at root, `apps/api`, `apps/worker` (SMTP + WhatsApp configured) |

### In progress / known gaps 🔧

- **WhatsApp status bridge** — `ProvidersService.getWhatsAppStatus()` reads the `whatsapp:status` key from Redis, but the worker never writes it, so the endpoint always reports `unknown`. *(Being fixed today.)*
- **Dashboard** — v1 + DLQ panel done. Still missing: WhatsApp QR display, pagination/filters UI.
- **Failed-job reason capture** — `failedReason` sometimes stores a truncated/odd string (saw `"t"` from whatsapp-web.js); processors should store `err?.message ?? String(err)`.
- **Don't run `pnpm build` while `pnpm dev` is running** — `next build` clobbers the dev server's `.next` dir and breaks it until restart. Build only api/worker (`pnpm --filter @communication/api build`) when the stack is up.
- **Duplicate Message entity** — `apps/worker/src/database/entities/message.entity.ts` is a copy of the API's; should move to `packages/shared` eventually.
- **Per-key rate limits** — Roadmap calls for configurable limits *per API key*; current throttling is global/per-route.
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
- **Committed** everything since the initial commit (migrations, JWT auth, dashboard, DLQ). Removed the admin password from start.md first — verified it was never in any pushed commit, so no rotation needed (start.md now points to `SEED_*` env vars / seed output instead). Scanned the full diff for secrets: clean; `.env`s and WhatsApp sessions confirmed ignored. **Push pending**: no working GitHub credentials in the terminal — `~/.ssh/id_ed25519_github` is not registered with the GitHub account (`Permission denied (publickey)`), no `gh` CLI, no credential helper. Push from VSCode's Source Control, or add the public key to GitHub and `git remote set-url origin git@github.com:basil51/communicat.git`.

---

## Next up (priority order)

1. Dashboard: WhatsApp QR display (so linking doesn't require terminal access).
2. Processors: robust error capture (`err?.message ?? String(err)`).
3. Phase 2 kickoff: message templates with `{{variables}}`.
