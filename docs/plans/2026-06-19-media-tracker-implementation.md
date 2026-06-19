# Shanuzz Content Production Tracker — Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build a mobile-first task tracking app for the Shanuzz digital media pipeline with WhatsApp notifications.

**Architecture:** Next.js 14 App Router (standalone output), Prisma + PostgreSQL on existing coolify-db, Redis on coolify-redis for WhatsApp queue, separate WhatsApp bot service using @whiskeysockets/baileys, JWT auth with bcrypt, client-side image compression.

**Tech Stack:** Next.js 14.2, Prisma 6.5, PostgreSQL 16, Redis 7, Tailwind CSS 3.4, TypeScript, Baileys, bcryptjs, jose (JWT), browser-image-compression

---

## Phase 1: Project Scaffold & Database

### Task 1: Initialize Next.js project

**TDD scenario:** N/A — project initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `postcss.config.js`
- Create: `tailwind.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `next-env.d.ts`

**Steps:**
1. Create package.json matching reference project conventions (Next 14.2, React 18.3, Prisma 6.5, Tailwind 3.4)
2. Add new dependencies: bcryptjs, jose, browser-image-compression, @whiskeysockets/baileys (for WA service), ioredis, uuid, multer
3. Copy tsconfig.json from reference project
4. Write next.config.js with standalone output
5. Copy tailwind.config.ts and postcss.config.js from reference project
6. Copy globals.css from reference project
7. Run `npm install`

### Task 2: Prisma schema & database setup

**TDD scenario:** N/A — schema definition

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `src/lib/auth.ts`

**Steps:**
1. Write Prisma schema with Task and User models (single table per PRD)
2. Generate Prisma client: `npx prisma generate`
3. Create db.ts singleton (same pattern as reference project)
4. Create auth.ts with JWT sign/verify using jose, bcrypt password hash/compare
5. Create seed script for admin user: `prisma/seed.ts`

### Task 3: Environment & Docker setup

**TDD scenario:** N/A — config files

**Files:**
- Create: `Dockerfile` (multi-stage, matching reference)
- Create: `docker-compose.yml` (web + wa services)
- Create: `.dockerignore`
- Create: `deploy.sh`

**Steps:**
1. Write Dockerfile with prisma generate + standalone output
2. Write docker-compose.yml with Traefik labels for `app-media-tracker.aika-shuz.fyi`
3. Write deploy.sh for server deployment
4. Add DNS setup instructions for Cloudflare

---

## Phase 2: Authentication

### Task 4: Login page & API

**TDD scenario:** New feature — full TDD cycle

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/middleware.ts`
- Modify: `src/lib/auth.ts`

**Steps:**
1. Create POST /api/auth/login — validate username/password, return JWT in httpOnly cookie
2. Create GET /api/auth/me — return current user from JWT cookie
3. Create middleware.ts — protect /api/tasks, /api/users routes; redirect /login if authenticated
4. Create login page with mobile-first dark UI (username + password + submit)
5. Test: login with seed admin user, verify JWT cookie, verify redirect to dashboard

### Task 5: User management (admin)

**TDD scenario:** New feature — full TDD cycle

**Files:**
- Create: `src/app/api/users/route.ts` (GET list, POST create)
- Create: `src/app/admin/users/page.tsx`
- Create: `prisma/seed.ts`

**Steps:**
1. Create admin-only GET /api/users → list all users
2. Create admin-only POST /api/users → create new user (username, password, role)
3. Create seed.ts that creates default admin and staff user
4. Create /admin/users page with table of users and create-user form

---

## Phase 3: Core Task Management API

### Task 6: Task CRUD API

**TDD scenario:** New feature — full TDD cycle

**Files:**
- Create: `src/app/api/tasks/route.ts` (GET list, POST create)
- Create: `src/app/api/tasks/[id]/route.ts` (GET, PUT, DELETE)
- Create: `src/lib/tasks.ts` (business logic: ID generation, status validation)
- Create: `src/lib/photo.ts` (photo upload handling, compression)

**Steps:**
1. Create tasks.ts with generateTaskId() — auto-increment SHANUZZ-XXXX format
2. Create tasks.ts with STATUS_FLOW map and validateStatusTransition()
3. Create GET /api/tasks — list with query filters (status, search, influencer, service, gender)
4. Create POST /api/tasks — admin-only, create new task with auto-generated ID
5. Create GET /api/tasks/[id] — get single task
6. Create PUT /api/tasks/[id] — admin: full update; staff: status-only update
7. Create DELETE /api/tasks/[id] — admin-only
8. Photo upload: accept multipart, save to /uploads/, return path

### Task 7: Status update & Ping Admin API

**TDD scenario:** New feature — full TDD cycle

**Files:**
- Create: `src/app/api/tasks/[id]/ping-admin/route.ts`
- Create: `src/lib/whatsapp.ts` (Redis queue publisher)

**Steps:**
1. Status update: auto-capture updatedBy (from JWT) and updatedAt timestamp
2. POST /api/tasks/[id]/ping-admin — push message to Redis "whatsapp:send" queue
3. Include taskId in WhatsApp message payload
4. WhatsApp queue messages include jitter delay for anti-ban

---

## Phase 4: Frontend Pages

### Task 8: App layout & navigation

**TDD scenario:** N/A — layout component

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/components/layout.tsx` (mobile-first with bottom nav)
- Create: `src/app/page.tsx` (dashboard)

**Steps:**
1. Create layout.tsx with Inter font, dark theme, PWA meta tags
2. Create mobile-first layout component with bottom navigation bar
3. Nav items: Dashboard (active tasks), History, and Admin (if admin role)
4. Top bar with app title and user info / logout

### Task 9: Dashboard page

**TDD scenario:** N/A — page component

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/components/task-card.tsx`
- Create: `src/components/filter-bar.tsx`
- Create: `src/components/status-badge.tsx`

**Steps:**
1. Dashboard fetches active tasks (status != "Task Completed" OR completed within 24h)
2. Display as vertical card list (mobile-first, single column)
3. FilterBar with: Influencer toggle, Service dropdown, Gender dropdown
4. Each TaskCard shows: customer name, shoot date, service, gender, status badge, influencer icon
5. Tapping card navigates to /tasks/[id]
6. Stats bar at top: count of tasks per status

### Task 10: Task detail page

**TDD scenario:** N/A — page component

**Files:**
- Create: `src/app/tasks/[id]/page.tsx`
- Create: `src/components/status-buttons.tsx`
- Create: `src/components/ping-admin-button.tsx`

**Steps:**
1. Fetch single task by ID
2. Admin view: all fields editable (or link to edit form)
3. Staff view: all fields read-only except Current Status
4. StatusButtons: quick-edit buttons showing next valid status transitions
5. PingAdminButton: visible to staff, triggers WhatsApp notification
6. Display photo if present (from /api/uploads/...)
7. Activity log: show created/updated timestamps

### Task 11: Create/edit task page

**TDD scenario:** N/A — page component

**Files:**
- Create: `src/app/tasks/new/page.tsx` (admin only)
- Create: `src/app/tasks/[id]/edit/page.tsx` (admin only)
- Create: `src/components/task-form.tsx`
- Create: `src/components/image-uploader.tsx`

**Steps:**
1. TaskForm with all fields: Customer Name, Shoot Date (date picker), Service (dropdown), Gender (dropdown), Influencer (toggle), Photo (file upload with auto-compression), Note (textarea)
2. ImageUploader: client-side compression using browser-image-compression, target max 1MB, resize to max 1920px
3. Status defaults to "New" (set server-side)
4. Created By / Created At set server-side
5. Validation: required fields (Customer Name, Shoot Date, Service, Gender)

### Task 12: History page

**TDD scenario:** N/A — page component

**Files:**
- Create: `src/app/history/page.tsx`
- Create: `src/components/search-bar.tsx`

**Steps:**
1. Query tasks where status = "Task Completed" AND updatedAt > 24h ago
2. SearchBar: search by Customer Name or Task ID
3. Display as list with same card layout
4. Click to view detail (read-only)

---

## Phase 5: WhatsApp Bot Service

### Task 13: WhatsApp bot service

**TDD scenario:** N/A — separate service

**Files:**
- Create: `wa-bot/package.json`
- Create: `wa-bot/index.ts`
- Create: `wa-bot/auth/` (Baileys auth state)

**Steps:**
1. Create separate Node.js project for WhatsApp bot
2. Connect to Baileys with provided bot phone number
3. Subscribe to Redis "whatsapp:send" channel
4. On message received: send to team WhatsApp group (by JID) AND DM the next staff member
5. Implement random jitter delays (200ms-2s) between messages
6. Determine next staff member based on status flow
7. Include in docker-compose as separate service

---

## Phase 6: Deployment

### Task 14: Final integration & deployment

**TDD scenario:** N/A — deploy

**Files:**
- Create: `DEPLOY.md`

**Steps:**
1. Test all flows end-to-end locally
2. Build Docker images
3. Deploy to NAS server via SSH
4. Add DNS record for `app-media-tracker.aika-shuz.fyi` on Cloudflare
5. Verify SSL via Traefik
6. Run Prisma migration on production DB
7. Seed admin user

---

## File Structure Summary

```
app-media-tracker.aika-shuz.fyi/
├── package.json
├── tsconfig.json
├── next.config.js
├── postcss.config.js
├── tailwind.config.ts
├── next-env.d.ts
├── .gitignore
├── .env.example
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── deploy.sh
├── DEPLOY.md
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── uploads/           (gitignored, Docker volume)
├── wa-bot/
│   ├── package.json
│   ├── index.ts
│   └── auth/
├── docs/
│   └── plans/
│       └── 2026-06-19-media-tracker-implementation.md
└── src/
    ├── middleware.ts
    ├── lib/
    │   ├── db.ts
    │   ├── auth.ts
    │   ├── tasks.ts
    │   └── whatsapp.ts
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx               (dashboard)
    │   ├── login/
    │   │   └── page.tsx
    │   ├── history/
    │   │   └── page.tsx
    │   ├── admin/
    │   │   └── users/
    │   │       └── page.tsx
    │   ├── tasks/
    │   │   ├── new/
    │   │   │   └── page.tsx
    │   │   └── [id]/
    │   │       ├── page.tsx        (detail)
    │   │       └── edit/
    │   │           └── page.tsx
    │   └── api/
    │       ├── auth/
    │       │   ├── login/route.ts
    │       │   ├── logout/route.ts
    │       │   └── me/route.ts
    │       ├── users/route.ts
    │       ├── tasks/
    │       │   ├── route.ts        (list + create)
    │       │   └── [id]/
    │       │       ├── route.ts    (get + update + delete)
    │       │       └── ping-admin/route.ts
    │       └── upload/route.ts
    └── components/
        ├── layout.tsx
        ├── task-card.tsx
        ├── task-form.tsx
        ├── status-badge.tsx
        ├── status-buttons.tsx
        ├── ping-admin-button.tsx
        ├── search-bar.tsx
        ├── filter-bar.tsx
        ├── image-uploader.tsx
        ├── login-form.tsx
        └── bottom-nav.tsx
```
