# API Reference

All routes prefixed with `/api`. Auth required unless marked.

## Authentication

### POST /api/auth/login
Login and receive JWT cookie.
```json
// Request
{ "username": "admin", "password": "admin123" }
// Response 200
{ "user": { "id": 1, "username": "admin", "role": "admin" } }
```

### GET /api/auth/me
Get current user from JWT cookie.
```json
// Response 200
{ "user": { "id": 1, "username": "admin", "role": "admin", "displayName": "Admin" } }
```

### POST /api/auth/logout
Clear JWT cookie.
```json
// Response 200
{ "success": true }
```

---

## Tasks

### GET /api/tasks
List tasks. Query params: `status`, `search`, `influencer`, `service`, `gender`, `createdAfter`, `createdBefore` (ISO date strings).
```json
// Response 200
{ "tasks": [{ "id": "SHANUZZ-0001", "customerName": "...", ... }] }
```

### POST /api/tasks `[admin/su/staff]`
Create task. Due date and assignedTo required for su.
```json
// Request
{
  "customerName": "Rahul & Priya",
  "shootDate": "2025-07-15",
  "dueDate": "2025-07-20",
  "service": "Wedding",
  "gender": "Female",
  "isInfluencer": true,
  "assignedTo": ["staff"],
  "note": "Destination wedding"
}
// Response 201
{ "task": { "id": "SHANUZZ-0001", ... } }
```

### GET /api/tasks/:id
Get single task.

### PUT /api/tasks/:id
Update task. **Staff:** status only (forward). **Admin/su:** full update + bidirectional status.
Also creates an `ActivityLog` entry recording the change (status transition or field-level edits).
```json
// Staff: update status
{ "status": "Video Shot" }
// Admin: full update
{ "customerName": "...", "status": "Reviewed", "assignedTo": ["staff", "admin"] }
```

### DELETE /api/tasks/:id `[admin/su]`
Delete task.

### POST /api/tasks/:id/ping-admin
Request admin correction. Triggers WhatsApp + notification.
```json
// Request (optional)
{ "reason": "Wrong status clicked" }
// Response 200
{ "success": true, "message": "Admin notified about task SHANUZZ-0001" }
```

### GET /api/tasks/:id/comments
List comments.

### POST /api/tasks/:id/comments
Add comment. Triggers notification + push.
```json
// Request
{ "text": "Client wants re-edit" }
```

### GET /api/tasks/:id/shot-items
List shot items.

### POST /api/tasks/:id/shot-items
Add shot item.
```json
// Request
{ "description": "Drone shot of venue" }
```

### PUT /api/tasks/:id/shot-items
Toggle shot item completion.
```json
// Request
{ "itemId": 1, "completed": true }
```

### DELETE /api/tasks/:id/shot-items
Delete shot item.
```json
// Request
{ "itemId": 1 }
```

### GET /api/tasks/:id/activity
List activity log entries for a task (newest first). Each entry records who did what, with a human-readable detail string and optional JSON metadata.
```json
// Response 200
{
  "activities": [{
    "id": 1,
    "taskId": "SHANUZZ-0001",
    "actor": "staff",
    "action": "status_change",
    "detail": "Status: New → Video Shot",
    "metadata": { "oldStatus": "New", "newStatus": "Video Shot" },
    "createdAt": "2026-06-20T..."
  }]
}
```

### GET /api/tasks/:id/urls
List platform URLs attached to a task.
```json
// Response 200
{ "urls": [{ "id": 1, "platform": "Instagram", "url": "https://...", "label": null }] }
```

### POST /api/tasks/:id/urls
Add a platform URL to a task. Creates an ActivityLog entry.
```json
// Request
{ "platform": "Instagram", "url": "https://instagram.com/p/...", "label": null }
// Response 200
{ "url": { "id": 1, "platform": "Instagram", "url": "https://...", "label": null } }
```
**Platform enum:** `Instagram`, `YouTube Shorts`, `YouTube`, `Snapchat`, `Facebook`, `Google Business Profile`, `Custom`

**Custom label:** When platform is `Custom`, a `label` field is required instead of the platform name.

### DELETE /api/tasks/:id/urls
Remove a platform URL.
```json
// Request
{ "urlId": 1 }
// Response 200
{ "success": true }
```

---

## Users `[admin/su]`

### GET /api/users
List all users.

### POST /api/users
Create user.
```json
// Request
{ "username": "newstaff", "password": "pass123", "role": "staff" }
```

### PUT /api/users
Change password. Superuser cannot be modified.
```json
// Request
{ "username": "staff", "password": "newpass123" }
```

### DELETE /api/users
Delete user. Superuser cannot be deleted.
```
DELETE /api/users?username=staff
```

---

## Notifications

### GET /api/notifications
List 50 most recent.

### GET /api/notifications/count
Return unread count.

### POST /api/notifications/read
Mark all as read.

### PUT /api/notifications/:id
Toggle single notification read/unread.
```json
// Request
{ "read": true }
```

---

## Push Notifications

### POST /api/push/subscribe
Register push subscription.
```json
// Request
{ "endpoint": "https://...", "p256dh": "...", "auth": "..." }
```

### DELETE /api/push/subscribe
Remove subscription.
```json
// Request
{ "endpoint": "https://..." }
```

---

## Analytics `[admin/su]`

### GET /api/analytics
Return aggregate stats. Query param: `?type=all|influencer|regular` to filter by influencer status.
```json
// Response 200
{
  "totalTasks": 25,
  "influencerRatio": 40,
  "statusBreakdown": [{ "status": "New", "count": 5 }, ...],
  "monthlyTrend": [{ "month": "2025-07", "total": 10, "completed": 3 }],
  "serviceBreakdown": [{ "service": "Wedding", "count": 8 }],
  "rejectionRate": 12,
  "rejectionsByStage": { "Reviewed": 3 },
  "avgTatDays": 2.5,
  "assigneeBreakdown": [{ "username": "Zubair", "total": 5, "pending": 2, "completed": 3, "rejected": 1 }],
  "qualityScores": [{ "username": "Zubair", "reworkCount": 1, "totalAssigned": 5, "reworkRate": 20 }]
}
```

---

## Upload

### POST /api/upload
Upload photo (multipart). Max 5MB. Auto-compressed client-side to ~1MB JPEG.
```
// FormData
{ "file": <File> }
// Response 200
{ "path": "/api/uploads/1624000000-abc123.jpg" }
```

### GET /api/uploads/:filename
Serve uploaded file.

---

## Role Permissions

| Endpoint | su | admin | staff |
|----------|:--:|:-----:|:-----:|
| GET /api/tasks | ✅ | ✅ | ✅ |
| POST /api/tasks | ✅ | ✅ | ✅ |
| PUT /api/tasks/:id (full) | ✅ | ✅ | ❌ |
| PUT /api/tasks/:id (status) | ✅ | ✅ | ✅ |
| DELETE /api/tasks/:id | ✅ | ✅ | ❌ |
| POST /api/tasks/:id/ping-admin | ✅ | ✅ | ✅ |
| GET/POST/PUT/DELETE /api/users | ✅ | ✅ | ❌ |
| GET /api/analytics | ✅ | ✅ | ❌ |
| GET /api/tasks/:id/activity | ✅ | ✅ | ✅ |
| GET/POST/DELETE /api/tasks/:id/urls | ✅ | ✅ | ✅ |
