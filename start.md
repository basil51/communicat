# Daily Start Guide

## 1. Start infrastructure

```bash
pnpm docker:up
```

This brings up **PostgreSQL** (port 5433) and **Redis** (port 6379).

---

## 2. Run migrations (only when there are new ones)

```bash
pnpm db:migrate
```

> Skip this if you haven't pulled new migration files.

---

## 3. Start dev servers

```bash
pnpm dev
```

Starts all three apps in parallel:

| App       | URL                      |
|-----------|--------------------------|
| Dashboard | http://localhost:3000    |
| API       | http://localhost:3001    |
| Worker    | (background, no browser) |

---

## Services at a glance

| Service    | Host        | Port |
|------------|-------------|------|
| PostgreSQL  | localhost   | 5433 |
| Redis       | localhost   | 6379 |
| API         | localhost   | 3001 |
| Dashboard   | localhost   | 3000 |

API docs (Swagger): http://localhost:3001/api

---

## End of day

```bash
pnpm docker:down
```

---

## Useful commands

```bash
# Generate a new migration after changing entities
pnpm --filter @communication/api db:migration:generate -- -n MigrationName

# Revert the last migration
pnpm --filter @communication/api db:migration:revert

# Seed the database
pnpm --filter @communication/api seed

# Build all packages + apps
pnpm build
```
