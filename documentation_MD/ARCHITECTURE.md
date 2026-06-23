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
    │   Next.js 14.2     │ Redis   │  Baileys Bot    │
    │   (Node.js 20)     │◄───────▶│  (Node.js 20)   │──▶ WhatsApp
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
| Frontend | Next.js 14 App Router, React 18, Tailwind CSS 3.4, html2canvas |
| Backend | Next.js API Routes (Route Handlers) |
| Database | PostgreSQL 15 (Prisma ORM 6.x) |
| Cache/Queue | Redis 7 (ioredis) |
| Auth | JWT (jose) + bcryptjs, httpOnly cookies |
| WhatsApp | @whiskeysockets/baileys via Redis queue |
| Push | web-push + Service Worker (manual opt-in via user click) |
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
│   ├── page.tsx               # Dashboard (sort, filter, bulk, select, photo thumbnails)
│   ├── login/page.tsx         # Login form
│   ├── kanban/page.tsx        # Kanban board (pull-to-refresh, photo thumbnails)
│   ├── settings/page.tsx      # Settings (notification toggle, version info)
│   ├── history/page.tsx       # Archived tasks (>24h)
│   ├── analytics/page.tsx     # Admin analytics dashboard (metrics, status, rejection, TAT, assignee, export)
│   ├── notifications/page.tsx # Notification list with read/unread
│   ├── admin/users/page.tsx   # User management
│   ├── tasks/
│   │   ├── new/page.tsx       # Create task
│   │   └── [id]/
│   │       ├── page.tsx       # Task detail (status, comments, shot list, activity timeline, URL display)
│   │       └── edit/page.tsx  # Edit task form
│   └── api/                   # Route handlers (see API reference)
└── components/
    ├── layout.tsx              # App shell (header, sidebar, bottom nav, user dropdown)
    ├── task-card.tsx           # Dashboard task card (photo thumbnail + ImagePreview)
    ├── task-form.tsx           # Create/edit form
    ├── image-uploader.tsx      # Client-side compression + upload (camera/gallery picker)
    ├── image-preview.tsx       # Image peek/hover/lightbox (long-press, tooltip, portal)
    ├── url-collector.tsx       # Platform URL collection modal on task completion
    ├── pull-to-refresh.tsx     # Touch-swipe pull-to-refresh wrapper (kanban)
    ├── filter-bar.tsx          # Influencer/service/gender filters
    ├── search-bar.tsx          # Search input
    ├── status-badge.tsx        # Colored status pill
    ├── status-buttons.tsx      # Forward-only status buttons with confirmation dialog
    ├── ping-admin-button.tsx   # WhatsApp alert with confirm dialog
```

## Auth Flow

1. Login → bcrypt verify → JWT signed → httpOnly cookie set
2. Each request → cookie read → Edge middleware verifies JWT via jose
3. `requireAuth()` → returns session payload
4. `requireAdmin()` → checks role is `admin` or `su`

Roles:
- **su** — Superuser, locked from frontend editing, full access
- **admin** — Full CRUD, user management, bidirectional status, analytics
- **staff** — Create tasks, forward-only status, ping admin

## Data Flow (Status Update)

1. User clicks status button (or selects from dropdown)
2. **Confirmation dialog** ("Save changes?") appears — user must confirm
3. If moving Uploaded → Task Completed: **URL collector modal** appears requesting platform URLs
4. `PUT /api/tasks/[id]` → validates transition (staff: forward only, admin/su: any)
5. Updates `updatedBy` + `updatedAt` + status
6. Creates `ActivityLog` entry (immutable audit trail with old/new status and actor)
7. Creates `Notification` record (in-app bell)
8. Calls `sendPushNotifications()` (browser push)
9. Enqueues WhatsApp message to Redis `whatsapp:send` channel
10. WA bot picks up → team group message + DM next responsible staff

## Activity Log Flow

Every task update creates an `ActivityLog` entry:
- **Status changes:** `action: "status_change"`, `detail: "Status: New → Video Shot"`, `metadata: { oldStatus, newStatus }`
- **Field edits (admin):** `action: "field_update"`, `detail: "Updated: customerName, service"`, `metadata: { fields: [...] }`
- **Photo changes:** `action: "photo_added"` or `"photo_removed"` (if only photo changed) or included in `field_update` (if combined with other changes)
- Activity log is fetched on the task detail page via `GET /api/tasks/[id]/activity` and displayed as a chronological timeline

## URL Collection Flow

1. User moves task from Uploaded → Task Completed
2. Frontend intercepts: shows `UrlCollector` modal
3. User adds ≥1 platform URL with dropdown (Instagram, YouTube, Snapchat, etc.)
4. Each URL POSTed to `/api/tasks/[id]/urls` → saved to `task_urls` table + ActivityLog entry
5. After saving, PUT status to "Task Completed"
6. URLs displayed on task detail page as clickable links
7. **Without at least one URL, the status cannot change**

## Image Preview Architecture

The `ImagePreview` component wraps the thumbnail `<img>` on dashboard and kanban cards:

| Mode | Trigger | Platform | Behavior |
|------|---------|----------|----------|
| Peek | Long-press (300ms delay) | Mobile | Centered modal with dim backdrop, dismiss on finger lift |
| Hover | onMouseEnter (350ms delay) | Desktop | Tooltip near icon with smart border-flip, dismiss on mouse leave |
| Lightbox | Quick click/tap | Both | Portal to document.body, fixed z-[9999], rgba backdrop 0.85, 48px close button, download button |

The thumbnail is 24×24px on dashboard cards and 20×20px on kanban cards, positioned next to the Task ID.

## Push Notification Flow (Updated)

1. User opens ⋮ settings menu → clicks **Enable Notifications** (button only visible when `Notification.permission === "default"`)
2. `Notification.requestPermission()` called inside user click handler (browser-compliant)
3. If granted → `pushManager.subscribe()` + VAPID key
4. Subscription saved to `push_subscriptions` table via `POST /api/push/subscribe`
5. Status change / comment / ping-admin → `sendPushNotifications()` called
6. web-push sends payload via Web Push Protocol to all subscribed browsers
7. Service Worker `push` event → shows system notification
8. Click notification → opens task detail
9. Expired subscriptions auto-removed on 410/404 errors

**Note:** Auto-subscribe on page load was removed to prevent browser warnings. User must explicitly opt in.

## Task Assignment Restrictions

- **Staff:** Can only update tasks where they appear in `assignedTo[]`. API returns 403 + UI shows "🔒 You are not assigned to this task"
- **Admin/su:** Can update any task, bidirectional status (forward + backward)
- **Auto-assign:** Creator auto-added to `assignedTo` on task creation
- **su exception:** su is never auto-assigned. Must manually select staff. su filtered from staff picker

## Analytics Dashboard

The `/analytics` page (admin/su only) provides:
- **Key Metrics:** Total tasks, influencer ratio, completed count, rejection rate, average turnaround time
- **Status Distribution:** Horizontal bar chart for all pipeline stages including a derived Rejected row
- **Rejection Analysis:** Stage-by-stage breakdown showing which stage triggers the most rejections
- **Monthly Trend:** Dual-bar chart (Created vs Completed) per month with legend
- **Assignee Productivity:** Bar chart per team member with pending/completed/rejected breakdown
- **Quality Scores:** Rework rate % per assignee with color-coded thresholds
- **By Service:** Service volume sorted by count with distinct color per service
- **Influencer Toggle:** Toggle between All / Influencer / Regular to filter all dashboard data

### Export Feature

- **Share Report** — Captures a PNG screenshot of the full dashboard via html2canvas, shares via Web Share API (WhatsApp) or downloads the image with a text summary copied to clipboard
- **Download CSV** — Generates a CSV with Task ID, Creation Date, Service, Influencer Status, Stage, Assignee, and Completion Date
- **Timeframe Filter** — "Last 7 Days", "This Month", or "All Time" constrains both export types

## Settings Page

The `/settings` page provides:
- **Notification toggle:** Enable (default permission), Disabled (granted), Blocked (denied)
- **App info:** Version number (v1.1.0)
- Accessed via the ⋮ dropdown menu in the header
