# Communication Service Roadmap

## Vision

Build a standalone communication platform that can be integrated with any SparkCo product through a unified API.

Integration examples:
* POS Systems
* E-Commerce Platforms
* CRM Systems
* School Management Systems
* Clinic Management Systems
* Gym Management Systems
* Future SaaS Products

---

# Phase 1 — MVP

**Goal:** Working platform capable of sending Email and WhatsApp messages through a unified API with full delivery tracking.

---

## Authentication

Two auth models serving different purposes:

| Model | Used by | Purpose |
|---|---|---|
| API Key | External systems / integrations | Authenticate API requests via `X-API-Key` header |
| JWT | Dashboard users | Login sessions for the admin UI |

---

## Email Provider

* SMTP configuration
* HTML emails
* Plain text emails
* Configurable from address

---

## WhatsApp Provider

* QR code login
* Session persistence (file-based)
* Connection monitoring and auto-reconnect
* Single WhatsApp account per deployment

> **Note:** `whatsapp-web.js` operates by reverse-engineering WhatsApp Web. Accounts can be banned without warning. This is acceptable for internal/low-volume use but should not be used for high-volume or production SaaS without evaluating the official WhatsApp Business API (Meta) as an alternative.

---

## Message Queue

* Redis + BullMQ
* Per-channel queues (email queue, whatsapp queue)
* Automatic retry with exponential backoff (3 attempts)
* Dead-letter queue for permanently failed messages
* Job concurrency limits to avoid provider throttling

---

## Message Status Tracking

Every message moves through a defined lifecycle stored in PostgreSQL:

```
queued → processing → sent → delivered
                    ↘ failed (with error reason)
```

* All status transitions are logged with timestamps
* Failed messages are moved to dead-letter queue after exhausting retries
* Dashboard displays full message history and failure reasons

---

## Rate Limiting

* Per API-key rate limiting on the send endpoint
* Configurable limits per key
* Returns `429 Too Many Requests` when exceeded

---

## Dashboard

* Provider connection status (WhatsApp QR scan, SMTP test)
* Message logs with status and timestamps
* Queue depth and worker health monitoring
* Dead-letter queue viewer (inspect + retry failed messages)

---

## API Endpoints

```
POST   /api/v1/messages/send          Send a message (returns 202 + message ID)
GET    /api/v1/messages/:id           Get message delivery status
GET    /api/v1/providers/status       Check all provider connections
GET    /api/v1/health                 Service health check
```

---

# Phase 2 — Templates, Scheduling & Webhooks

* **Message Templates** — reusable templates with variable placeholders (`{{name}}`, `{{amount}}`)
* **Scheduled Messages** — send at a specific datetime
* **Delayed Messages** — send after a delay (e.g., 30 minutes)
* **Bulk Messaging** — send to a list of recipients in a single API call
* **Webhooks** — register a callback URL to receive delivery status updates when a message is sent, fails, or is delivered

---

# Phase 3 — Multi-Tenant

**Goal:** Allow multiple isolated applications/products to share the platform without data leakage.

* **Tenants** — each SparkCo product is a tenant with its own API keys and usage quota
* **Isolation Strategy** — row-level security using `tenant_id` on all tables (single database, shared schema)
* **API Keys per Tenant** — scoped keys with configurable channel permissions (e.g., only email)
* **Provider Isolation** — tenants can optionally supply their own SMTP credentials or WhatsApp session
* **Usage Tracking** — per-tenant message count, quota enforcement, and usage history

> **Design note:** Multi-tenancy using row-level security requires `tenant_id` on all message and log tables from the start. Even in Phase 1, design the database schema with `tenant_id` as a nullable column so the migration to full multi-tenancy is not a breaking change.

---

# Phase 4 — Additional Providers

* **SMS** — Twilio or Vonage (simple HTTP API, low integration risk)
* **Telegram** — Bot API
* **Slack** — Incoming Webhooks or Slack App
* **Microsoft Teams** — Incoming Webhooks
* **Push Notifications** — Firebase Cloud Messaging (FCM)

Each new provider follows the same interface: implement the provider, register a queue, done.

---

# Phase 5 — SaaS Platform

* Billing and subscription plans (per message or monthly quota)
* Self-serve public portal (sign up, create tenant, generate API keys)
* Analytics dashboard (volume trends, failure rates, provider performance)
* Hosted WhatsApp Business API integration (replaces whatsapp-web.js for SaaS)
