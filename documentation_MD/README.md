# Shanuzz Media Tracker

Mobile-first task tracking application for the Shanuzz digital media pipeline — from video shoot to final upload.

**URL:** https://app-media-tracker.aika-shuz.fyi  
**Stack:** Next.js 14 · Prisma · PostgreSQL · Redis · Tailwind CSS · Baileys (WhatsApp) · web-push

## Quick Start

```bash
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

## Credentials (after seeding)

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Superuser | `su` | `nox18` | Full access, locked from UI |
| Admin | `admin` | `admin123` | Full CRUD, user management |
| Staff | `staff` | `staff123` | Create tasks, forward-only status |

## Features

- **Kanban Board** — Drag-free columns with quick-move buttons, overdue indicators, assigned staff
- **Bulk Operations** — Select multiple tasks, advance all at once
- **Comments & Shot List** — Threaded comments, checkable shot items per task
- **Notifications** — Real-time bell badge, read/unread toggle, browser push notifications
- **PWA** — Installable on mobile/desktop, offline cache, app icon badge
- **Dark/Light Mode** — Theme toggle with localStorage persistence
- **Analytics** — Status distribution, service breakdown, monthly trends
- **WhatsApp Integration** — Status updates trigger team group + direct messages
- **Role-Based Access** — 3 tiers (su → admin → staff)

## Documentation Index

| File | Content |
|------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data flow |
| [API_REFERENCE.md](./API_REFERENCE.md) | All API endpoints |
| [DATABASE.md](./DATABASE.md) | Schema and models |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Server deployment guide |
| [USER_GUIDE.md](./USER_GUIDE.md) | Usage by role |

## Status Workflow

```
New → Video Shot → Data Copied → Video Edited → Reviewed → Uploaded → Task Completed
```

- **Staff:** Forward-only status updates
- **Admin/su:** Bidirectional status (forward + backward)
- **Ping Admin:** Staff can request admin correction via WhatsApp
