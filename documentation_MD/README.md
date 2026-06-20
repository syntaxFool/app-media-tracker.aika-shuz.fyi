# Shanuzz Media Tracker

Mobile-first task tracking application for the Shanuzz digital media pipeline — from video shoot to final upload.

**URL:** https://app-media-tracker.aika-shuz.fyi  
**Version:** v1.0.1  
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

- **Dashboard** — Unified action bar (sort, filter, select, bulk advance, CSV export). Colored status metrics with dot indicators. Assigned staff + overdue badges on every card. Photo thumbnails with hover/long-press preview and tap-to-lightbox.
- **Kanban Board** — Snap-scroll columns, pull-to-refresh, hover quick-move buttons, overdue indicators, assigned staff display, column-level task counts. Photo thumbnails with preview.
- **Bulk Operations** — Select multiple tasks, advance all at once
- **Activity Timeline** — Every status change, field edit, photo add/remove is logged. Clickable URL history on task completion.
- **URL Collection** — When moving Uploaded → Task Completed, a popup collects platform URLs (Instagram, YouTube, etc.) before saving
- **Comments & Shot List** — Threaded comments, checkable shot items per task
- **Image Preview** — Long-press on mobile (peek overlay), hover on desktop (tooltip preview), click/tap opens persistent lightbox with zoom and download
- **Notifications** — New 🔔 Enable Notifications button in ⋮ settings menu (manual opt-in, no auto-request). Real-time bell badge, read/unread toggle
- **PWA** — Installable, offline cache, app icon badge via Navigator API, push notifications outside the app
- **Dark/Light Mode** — Theme toggle with localStorage persistence
- **Settings** — Dedicated `/settings` page with notification toggle and app info
- **Analytics** — Status distribution, service breakdown, monthly trends (admin only)
- **WhatsApp Integration** — Status updates trigger team group + direct messages via Redis queue
- **Role-Based Access** — 3 tiers (su → admin → staff). Staff can only move assigned tasks. Admin/su bidirectional status. FAB "+" button with cutout design
- **Status Confirmation** — "Save changes?" dialog appears before every status change (both staff buttons and admin dropdown)

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

- **Staff:** Forward-only status updates with confirmation dialog
- **Admin/su:** Bidirectional status (forward + backward) with confirmation dialog
- **Ping Admin:** Staff can request admin correction via WhatsApp
- **URL Collection:** Moving to Task Completed requires ≥1 platform URL
