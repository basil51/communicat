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
| Migrations | `InitialSchema` in `apps/api/src/database/migrations/`; dev DB baselined; `synchronize` disabled everywhere |
| Swagger | http://localhost:3001/api |
| Env | `.env` files present at root, `apps/api`, `apps/worker` (SMTP + WhatsApp configured) |

### In progress / known gaps 🔧

- **WhatsApp status bridge** — `ProvidersService.getWhatsAppStatus()` reads the `whatsapp:status` key from Redis, but the worker never writes it, so the endpoint always reports `unknown`. *(Being fixed today.)*
- **Dashboard** — placeholder page only. Needs: JWT login, provider status view, message logs, queue/DLQ monitoring.
- **Dead-letter queue viewer** — failed jobs are kept (`removeOnFail: false`) but there is no inspect/retry UI or endpoint.
- **JWT auth** — deps installed (`@nestjs/jwt`, `passport-jwt`) but no login endpoint or users table yet (dashboard blocker).
- **Duplicate Message entity** — `apps/worker/src/database/entities/message.entity.ts` is a copy of the API's; should move to `packages/shared` eventually.
- **Per-key rate limits** — Roadmap calls for configurable limits *per API key*; current throttling is global/per-route.
- **Not a git repository yet** — no version control on this work so far.

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

---

## Next up (priority order)

1. JWT auth module (users table, login endpoint) — unblocks the dashboard.
2. Dashboard v1: provider status + recent message log (read-only).
3. DLQ endpoints: list failed jobs, retry one/all.
4. `git init` + first commit.
