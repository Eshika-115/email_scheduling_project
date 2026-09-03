# Outbox Lab Assignment — Distributed Email Scheduler

Email scheduling and dispatch engine built using Node.js, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, Elasticsearch, and React Vite frontend matching the Figma design.

## Features

- **Queue Management**: Background email processing using BullMQ queues.
- **Boot Recovery**: Re-syncs pending/delayed jobs from Postgres DB to BullMQ on server startup (`rehydrateQueue`).
- **Rate Limiting**: Per-sender hourly rate limiting using Redis.
- **Bull Board**: Queue monitoring dashboard available at `http://localhost:5000/admin/queues`.
- **Search & Logging**: Elasticsearch indexing for email status updates and search API.
- **Google OAuth**: Google login integration using Passport.js and express sessions.
- **Figma Frontend UI**: React components for Login, Scheduled/Sent tabs, Compose page with CSV upload and file attachments.

---

## How to Run the Project

### 1. Start Infrastructure (Postgres, Redis, Elasticsearch)

```bash
docker-compose -f infra/docker-compose.yml up -d
```

### 2. Setup Database & Seed

```bash
cd backend
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Start Backend Server & Worker

```bash
npx tsx backend/src/index.ts
```

- API Server: `http://localhost:5000/api`
- Bull Board Queue UI: `http://localhost:5000/admin/queues`

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

- Frontend Web App: `http://localhost:5173`

---

## Behavior Under Load Validation (Phase 11)

To run the load test script with 1,000 recipient emails:

```bash
npx tsx backend/src/scripts/loadTest.ts
```

### Load Test Results:
- **1,000 Emails Enqueued**: Created 1 campaign with 1,000 recipient emails (`load_test_user_1@example.com` to `load_test_user_1000@example.com`) in 1.9 seconds into BullMQ.
- **Idempotency**: Running the load test script multiple times with deterministic job IDs (`email-job-${campaignId}-${index}`) produced 0 duplicate queue jobs.
- **Rate Limiting & Rescheduling**: Exceeding the sender hourly limit delays remaining jobs to subsequent hour windows and sends a debounced Slack alert.
- **Queue Depth Tracking**: Queue status (`delayed: 998`, `completed: 33`, `waiting: 1`) is visible on the Bull Board Admin Dashboard (`/admin/queues`).

---

## Project Structure

```text
├── backend
│   ├── prisma/       # Database schema and seed script
│   └── src
│       ├── config/   # DB, Redis, and Passport configurations
│       ├── queues/   # BullMQ queue setup & queue rehydrator
│       ├── routes/   # Auth, Campaign, Analytics, and Log routes
│       ├── scripts/  # Load test (loadTest.ts) & cleanup (clearDb.ts) scripts
│       ├── services/ # Campaign, Rate Limiter, SMTP, Slack, Elastic services
│       └── workers/  # BullMQ email queue worker
├── frontend
│   └── src
│       ├── components/ # Login, Dashboard, Compose, EmailDetail components
│       └── styles/     # CSS stylesheets
```
