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

- **Dashboard** — Unified action bar (sort, filter, select, bulk advance, CSV export). Colored status metrics with dot indicators. Assigned staff + overdue badges on every card.
- **Kanban Board** — Snap-scroll columns with peek preview, hover quick-move buttons, overdue indicators, assigned staff display, column-level task counts
- **Bulk Operations** — Select multiple tasks, advance all at once
- **Comments & Shot List** — Threaded comments, checkable shot items per task
- **Notifications** — Real-time bell badge, read/unread toggle, browser push notifications with auto-subscribe on login
- **PWA** — Installable, offline cache, app icon badge via Navigator API, push notifications outside the app
- **Dark/Light Mode** — Theme toggle with localStorage persistence
- **Analytics** — Status distribution, service breakdown, monthly trends (admin only)
- **WhatsApp Integration** — Status updates trigger team group + direct messages via Redis queue
- **Role-Based Access** — 3 tiers (su → admin → staff). Staff can only move assigned tasks. Admin/su bidirectional status. FAB "+" button with cutout design

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
