# Communication Service

Unified communication platform built by SparkCo.

Supports sending notifications through multiple communication channels using a single API.

---

# Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL |
| Queue | Redis + BullMQ |
| WhatsApp | whatsapp-web.js |
| Package Manager | pnpm |
| Containerization | Docker, Docker Compose |

---

# Project Structure

```text
communication-service/

apps/
├── dashboard/        # Next.js admin dashboard
├── api/              # NestJS REST API
└── worker/           # BullMQ background job processor

packages/
├── shared/           # Shared business logic and services
├── types/            # Shared TypeScript types and DTOs
└── utils/            # Shared utility functions

docker/               # Dockerfile and compose configs
docs/                 # Extended documentation
database/             # Migrations and seed scripts
```

---

# Requirements

* Docker
* Docker Compose
* pnpm

---

# Quick Start

```bash
pnpm install

docker compose up -d

pnpm db:migrate

pnpm dev
```

---

# Services

## Dashboard

Next.js admin application — provider status, message logs, queue monitoring.

Default Port: `3000`

## API

NestJS REST API — accepts messages and pushes them to the queue.

Default Port: `3001`

## Worker

BullMQ worker that processes the queue, dispatches messages through providers, and updates delivery status.

## PostgreSQL

Default Port: `5432`

## Redis

Default Port: `6379`

---

# Environment Variables

```env
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/communication

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Auth
JWT_SECRET=
API_KEY_SALT=

# Email (SMTP)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_HEADLESS=true
```

---

# Authentication

All API requests require an API key passed in the request header:

```
X-API-Key: your-api-key
```

The dashboard uses JWT-based authentication (email + password).

---

# API Examples

## Send Email

`POST /api/v1/messages/send`

```http
X-API-Key: your-api-key
Content-Type: application/json

{
  "channel": "email",
  "to": "user@example.com",
  "subject": "Welcome",
  "message": "Welcome to our platform"
}
```

Response `202 Accepted`:

```json
{
  "id": "msg_abc123",
  "status": "queued"
}
```

## Send WhatsApp

`POST /api/v1/messages/send`

```http
X-API-Key: your-api-key
Content-Type: application/json

{
  "channel": "whatsapp",
  "to": "+9725xxxxxxx",
  "message": "Hello from Communication Service"
}
```

## Check Message Status

`GET /api/v1/messages/:id`

```http
X-API-Key: your-api-key
```

Response:

```json
{
  "id": "msg_abc123",
  "channel": "email",
  "to": "user@example.com",
  "status": "delivered",
  "createdAt": "2025-01-01T10:00:00Z",
  "sentAt": "2025-01-01T10:00:02Z"
}
```

Message statuses: `queued` → `processing` → `sent` / `failed`

## Provider Status

`GET /api/v1/providers/status`

## Health Check

`GET /api/v1/health`

---

# Future Features

* SMS Providers (Twilio / Vonage)
* Telegram
* Slack
* Microsoft Teams
* Push Notifications
* Multi-Tenant with API Key isolation
* Billing and Subscription Plans
* SaaS Public Portal

---

# License

Private Project — SparkCo Internal Service
