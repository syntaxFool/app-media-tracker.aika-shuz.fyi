# Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Cloudflare DNS                             │
│                 app-media-tracker.aika-shuz.fyi                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Traefik (SSL)  │
                    │  Port 443 → 3000│
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐         ┌────────▼────────┐
    │  media-tracker-web │         │ media-tracker-wa│
    │   Next.js 14.2     │ Redis   │  Baileys Bot    │──▶ WhatsApp
    │   (Node.js 20)     │◄───────▶│  (Node.js 20)   │
    └────────┬───────────┘         └─────────────────┘
             │
    ┌────────▼───────────┐
    │  coolify-db (PG15) │
    │  coolify-redis (7) │
    └────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router, React 18, Tailwind CSS 3.4 |
| Backend | Next.js API Routes (Route Handlers) |
| Database | PostgreSQL 15 (Prisma ORM 6.x) |
| Cache/Queue | Redis 7 (ioredis) |
| Auth | JWT (jose) + bcryptjs, httpOnly cookies |
| WhatsApp | @whiskeysockets/baileys via Redis queue |
| Push | web-push + Service Worker |
| PWA | manifest.json + SW + Badge API |
| Proxy | Traefik v3.6 (Let's Encrypt SSL) |
| Deploy | Docker Compose on Ubuntu NAS |

## Directory Structure

```
src/
├── middleware.ts              # Auth guard (Edge Runtime)
├── lib/
│   ├── auth.ts                # Server-side: bcrypt, JWT sign, session helpers
│   ├── jwt-edge.ts            # Edge-compatible: JWT verify only
│   ├── db.ts                  # Prisma singleton
│   ├── tasks.ts               # Status flow, ID generation
│   ├── whatsapp.ts            # Redis queue publisher (ioredis)
│   ├── push.ts                # Web push notification sender
│   └── theme.tsx              # Dark/light ThemeProvider context
├── app/
│   ├── layout.tsx             # Root layout (fonts, metadata, PWA links)
│   ├── page.tsx               # Dashboard (sort, filter, bulk, select)
│   ├── login/page.tsx         # Login form
│   ├── kanban/page.tsx        # Kanban board
│   ├── history/page.tsx       # Archived tasks (>24h)
│   ├── analytics/page.tsx     # Admin analytics dashboard
│   ├── notifications/page.tsx # Notification list with read/unread
│   ├── admin/users/page.tsx   # User management
│   ├── tasks/
│   │   ├── new/page.tsx       # Create task
│   │   └── [id]/
│   │       ├── page.tsx       # Task detail (status, comments, shot list)
│   │       └── edit/page.tsx  # Edit task form
│   └── api/                   # Route handlers (see API reference)
└── components/
    ├── layout.tsx              # App shell (header, sidebar, bottom nav)
    ├── task-card.tsx           # Dashboard task card
    ├── task-form.tsx           # Create/edit form
    ├── filter-bar.tsx          # Influencer/service/gender filters
    ├── search-bar.tsx          # Search input
    ├── status-badge.tsx        # Colored status pill
    ├── status-buttons.tsx      # Forward-only status buttons
    ├── ping-admin-button.tsx   # WhatsApp alert with confirm dialog
    └── image-uploader.tsx      # Client-side compression + upload
```

## Auth Flow

1. Login → bcrypt verify → JWT signed → httpOnly cookie set
2. Each request → cookie read → Edge middleware verifies JWT via jose
3. `requireAuth()` → returns session payload
4. `requireAdmin()` → checks role is `admin` or `su`

Roles:
- **su** — Superuser, locked from frontend editing, full access
- **admin** — Full CRUD, user management, bidirectional status
- **staff** — Create tasks, forward-only status, ping admin

## Data Flow (Status Update)

1. Staff/admin/su updates status via UI or Kanban
2. `PUT /api/tasks/[id]` → validates transition (staff: forward only, admin/su: any)
3. Updates `updatedBy` + `updatedAt`
4. Creates `Notification` record (in-app bell)
5. Calls `sendPushNotifications()` (browser push)
6. Enqueues WhatsApp message to Redis `whatsapp:send` channel
7. WA bot picks up → team group message + DM next responsible staff

## Push Notification Flow

1. Browser registers Service Worker → subscribes to push → sends to `POST /api/push/subscribe`
2. Notification created → `sendPushNotifications()` called
3. web-push sends payload to all subscribed browsers via Web Push Protocol
4. Service Worker `push` event → shows system notification
5. Click notification → opens task detail
