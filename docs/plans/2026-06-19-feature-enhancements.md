# Feature Enhancement Plan — Shanuzz Media Tracker

**Goal:** Add dark/light toggle, sorting, filtering, notifications, due dates, bulk update, comments, CSV export, shot list, analytics, and video thumbnails.

**Architecture:** Extend existing single-table via migrations (add comments, due dates, shot list tables). All features are client-side + API extensions. No new services needed.

---

## Phase 1: Quick Wins (Dark Mode, Sort, My Tasks)

### Task 1: Dark/Light Mode Toggle
- Create `ThemeProvider` context + toggle button in top bar
- Persist preference in localStorage
- Apply `dark` class to `<html>` based on preference
- Define dark variant colors in tailwind.config via `dark:` modifiers

### Task 2: Sort Options
- Add sort dropdown on dashboard: "Newest", "Oldest", "Shoot Date", "Customer A-Z", "Status"
- Client-side sort of tasks array

### Task 3: My Tasks Filter
- Staff users see a toggle "My Tasks" that filters to their relevant status stage
- Map: role → status they're responsible for (e.g., editor → "Data Copied", "Video Edited")

---

## Phase 2: Notifications + Due Dates

### Task 4: In-App Notification Badge
- New table `notifications` (id, taskId, type, message, read, createdAt)
- API: GET /api/notifications (unread count), PUT /api/notifications/[id]/read
- Bell icon in top bar with unread count badge
- Status changes trigger notification creation in the API route

### Task 5: Due Dates & Overdue Flags
- Add `dueDate` field to Task model
- On dashboard: overdue tasks show red badge, due-soon (24h) show yellow
- Task detail shows due date with countdown

---

## Phase 3: Bulk Update + Comments

### Task 6: Bulk Status Update
- Dashboard gets a "Select" mode toggle
- Checkboxes appear on cards
- Select multiple → "Move to Next" button advances all selected tasks

### Task 7: Task Comments
- New table `comments` (id, taskId, author, text, createdAt)
- API: GET /api/tasks/[id]/comments, POST /api/tasks/[id]/comments
- Comment thread in task detail page

---

## Phase 4: CSV Export + Shot List

### Task 8: CSV Export
- Button on dashboard: "Export CSV"
- Downloads current filtered/sorted task list as CSV
- Fields: ID, Name, Date, Service, Gender, Status, Influencer, Note

### Task 9: Shot List Checklist
- New table `shot_items` (id, taskId, description, completed, completedBy, completedAt)
- Task form: add shot items inline (add/remove rows)
- Task detail: checkbox list for staff to check off

---

## Phase 5: Analytics + Video Thumbnails

### Task 10: Analytics Dashboard
- New page: /analytics (admin only)
- Stats: Tasks per status, avg time in each stage, monthly completions, service breakdown
- Simple bar/pie charts using recharts (already in package.json from reference project)

### Task 11: Video Thumbnail Preview
- Extend photo upload to accept video files
- Extract first frame as thumbnail using canvas
- Or: accept a separate thumbnail upload alongside photo
