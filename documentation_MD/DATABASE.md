# Database Schema

**Database:** PostgreSQL 15  
**ORM:** Prisma 6.x  
**Tables:** 8

---

## tasks

Main task table. One row per video production task.

| Column | Type | Required | Notes |
|--------|------|:--------:|-------|
| `id` | VARCHAR | ✅ | Primary key. Format: `SHANUZZ-0001` |
| `customer_name` | VARCHAR | ✅ | Customer/client name |
| `shoot_date` | TIMESTAMP | ✅ | Date of video shoot |
| `due_date` | TIMESTAMP | ✅ | Deadline for completion |
| `service` | VARCHAR | ✅ | Service type (enum list) |
| `gender` | VARCHAR | ✅ | Male/Female/Other |
| `is_influencer` | BOOLEAN | - | Default false |
| `photo_path` | VARCHAR | - | Path to uploaded photo |
| `note` | TEXT | - | Free text notes |
| `current_status` | VARCHAR | ✅ | Default "New". Workflow pipeline |
| `assigned_to` | JSONB | ✅ | Default `[]`. Array of usernames |
| `created_by` | VARCHAR | ✅ | Username of creator |
| `created_at` | TIMESTAMP | ✅ | Auto-generated |
| `updated_by` | VARCHAR | - | Username of last updater |
| `updated_at` | TIMESTAMP | - | Last update timestamp |

**Status values:** New, Video Shot, Data Copied, Video Edited, Reviewed, Uploaded, Task Completed

---

## users

| Column | Type | Required | Notes |
|--------|------|:--------:|-------|
| `id` | SERIAL | ✅ | Auto-increment |
| `username` | VARCHAR | ✅ | Unique |
| `password` | VARCHAR | ✅ | bcrypt hash |
| `role` | VARCHAR | ✅ | `su`, `admin`, or `staff` |
| `display_name` | VARCHAR | - | Display name in header |
| `is_superuser` | BOOLEAN | - | Protection flag |
| `created_at` | TIMESTAMP | ✅ | Auto-generated |

**Roles:**
- `su` — Superuser, locked from frontend, full access
- `admin` — Full CRUD, user management
- `staff` — Create tasks, forward-only status updates

---

## activity_logs

Immutable audit trail of all task changes. Created on every PUT, POST (url), or status update.

| Column | Type | Required | Notes |
|--------|------|:--------:|-------|
| `id` | SERIAL | ✅ | Auto-increment, Primary key |
| `task_id` | VARCHAR | ✅ | FK → tasks.id (CASCADE) |
| `actor` | VARCHAR | ✅ | Username who performed the action |
| `action` | VARCHAR | ✅ | `status_change`, `field_update`, `created`, `photo_added`, `photo_removed` |
| `detail` | VARCHAR | ✅ | Human-readable description (e.g. "Status: New → Video Shot") |
| `metadata` | JSONB | - | Arbitrary structured data (old/new values, list of changed fields) |
| `created_at` | TIMESTAMP | ✅ | Auto-generated |

**Index:** `(task_id, created_at)` — covers the primary query pattern (fetch all activities for a task, newest first).

---

## task_urls

Platform URLs attached to completed tasks. Populated during Uploaded → Task Completed via the URL collector modal.

| Column | Type | Required | Notes |
|--------|------|:--------:|-------|
| `id` | SERIAL | ✅ | Auto-increment, Primary key |
| `task_id` | VARCHAR | ✅ | FK → tasks.id (CASCADE) |
| `platform` | VARCHAR | ✅ | `Instagram`, `YouTube Shorts`, `YouTube`, `Snapchat`, `Facebook`, `Google Business Profile`, `Custom` |
| `url` | VARCHAR | ✅ | The actual URL |
| `label` | VARCHAR | - | Custom label when platform = `Custom` |
| `created_at` | TIMESTAMP | ✅ | Auto-generated |

**Index:** `(task_id)` — fast lookup when fetching URLs for a task.

---

## notifications

| Column | Type | Required | Notes |
|--------|------|:--------:|-------|
| `id` | SERIAL | ✅ | Auto-increment |
| `task_id` | VARCHAR | ✅ | FK → tasks.id (CASCADE) |
| `type` | VARCHAR | ✅ | `status_update`, `ping_admin`, `comment` |
| `message` | VARCHAR | ✅ | Human-readable notification |
| `read` | BOOLEAN | - | Default false |
| `created_at` | TIMESTAMP | ✅ | Auto-generated |

---

## comments

| Column | Type | Required | Notes |
|--------|------|:--------:|-------|
| `id` | SERIAL | ✅ | Auto-increment |
| `task_id` | VARCHAR | ✅ | FK → tasks.id (CASCADE) |
| `author` | VARCHAR | ✅ | Username |
| `text` | VARCHAR | ✅ | Comment text |
| `created_at` | TIMESTAMP | ✅ | Auto-generated |

---

## shot_items

| Column | Type | Required | Notes |
|--------|------|:--------:|-------|
| `id` | SERIAL | ✅ | Auto-increment |
| `task_id` | VARCHAR | ✅ | FK → tasks.id (CASCADE) |
| `description` | VARCHAR | ✅ | Shot description |
| `completed` | BOOLEAN | - | Default false |
| `completed_by` | VARCHAR | - | Username who checked it |
| `completed_at` | TIMESTAMP | - | When checked |
| `sort_order` | INT | - | Default 0, for ordering |

---

## push_subscriptions

| Column | Type | Required | Notes |
|--------|------|:--------:|-------|
| `id` | SERIAL | ✅ | Auto-increment |
| `endpoint` | VARCHAR | ✅ | Unique, browser push endpoint |
| `p256dh` | VARCHAR | ✅ | Encryption key |
| `auth` | VARCHAR | ✅ | Auth secret |
| `username` | VARCHAR | ✅ | Associated user |
| `created_at` | TIMESTAMP | ✅ | Auto-generated |

---

## Indexes & Relationships

```mermaid
erDiagram
    tasks ||--o{ activity_logs : "has"
    tasks ||--o{ task_urls : "has"
    tasks ||--o{ notifications : "has"
    tasks ||--o{ comments : "has"
    tasks ||--o{ shot_items : "has"

    tasks {
        string id PK
        string customer_name
        timestamp shoot_date
        timestamp due_date
        string service
        string gender
        boolean is_influencer
        string photo_path
        string note
        string current_status
        json assigned_to
        string created_by
        timestamp created_at
        string updated_by
        timestamp updated_at
    }

    users {
        int id PK
        string username UK
        string password
        string role
        string display_name
        boolean is_superuser
        timestamp created_at
    }

    activity_logs {
        int id PK
        string task_id FK
        string actor
        string action
        string detail
        json metadata
        timestamp created_at
        index taskId_createdAt
    }

    task_urls {
        int id PK
        string task_id FK
        string platform
        string url
        string label
        timestamp created_at
        index taskId
    }

    notifications {
        int id PK
        string task_id FK
        string type
        string message
        boolean read
        timestamp created_at
    }

    comments {
        int id PK
        string task_id FK
        string author
        string text
        timestamp created_at
    }

    shot_items {
        int id PK
        string task_id FK
        string description
        boolean completed
        string completed_by
        timestamp completed_at
        int sort_order
    }

    push_subscriptions {
        int id PK
        string endpoint UK
        string p256dh
        string auth
        string username
        timestamp created_at
    }
```

All child tables use `ON DELETE CASCADE` — deleting a task removes all related records (activity_logs, task_urls, notifications, comments, and shot items).
