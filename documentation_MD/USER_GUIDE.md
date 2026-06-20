# User Guide

## Roles

| Role | Capabilities |
|------|-------------|
| **su** | Everything. Cannot be edited/deleted from UI. Must assign staff when creating tasks |
| **admin** | Full CRUD, manage users, bidirectional status, analytics |
| **staff** | Create tasks, forward-only status updates, comments, shot list |

---

## Common Tasks

### Dashboard (Home)

- **Sort:** Dropdown to sort by newest, oldest, customer name, status, or shoot date
- **Filter:** Influencer toggle, service dropdown, gender dropdown
- **My Tasks:** Toggle to show only non-completed tasks
- **Select Mode:** Check multiple tasks → "Advance N →" to bulk-update status
- **CSV Export:** Downloads current filtered view as CSV
- **Photo Thumbnails:** If a task has a photo, a 24×24px thumbnail appears next to the Task ID. Hover (desktop) or long-press (mobile) for a quick preview. Click/tap to open the full lightbox with zoom and download buttons.

### Creating a Task

1. Tap the **+** button (center of bottom nav on mobile, or sidebar on desktop)
2. Fill Customer Name, Shoot Date, **Due Date** (required)
3. Select Service and Gender
4. Toggle Influencer if applicable
5. **Take Photo / Gallery** — choose whether to snap with camera or pick from gallery (auto-compresses to ~1MB)
6. **Assign Staff** (admin/su only): Click staff names to add/remove. su MUST assign at least one
7. Add note
8. Click **Create Task**

### Auto-Assignment

- When staff or admin creates a task, they are automatically assigned
- Admin can later change assignments from the edit page
- su is never auto-assigned — they must select staff members
- Tasks display assigned staff on dashboard cards and kanban

### Updating Status (Staff)

1. Open task detail
2. Click the next status button (e.g., "Move to Video Shot")
3. **Confirmation dialog** appears — "Save changes? Move task to Video Shot?" — click **Save** to confirm or **Cancel** to dismiss
4. On **Uploaded → Task Completed**: a URL collection popup appears first. Add at least one platform URL (Instagram, YouTube, etc.), then click **Save & Complete**. The status won't change until a URL is added.
5. Status updates trigger: ActivityLog entry + in-app notification + browser push + WhatsApp message

### Updating Status (Admin/su)

1. Open task detail
2. Use the **status dropdown** to pick ANY status (forward or backward)
3. **Confirmation dialog** appears — same as staff
4. Same URL collection on Uploaded → Task Completed

### Ping Admin (Staff)

If you accidentally update to the wrong status:
1. Open task detail
2. Click **Ping Admin**
3. Confirm the dialog
4. WhatsApp alert + in-app notification sent to admin

### Activity Timeline

1. Open task detail
2. The **Activity** section shows a chronological list of every change made to the task
3. Each entry shows: timestamp, who did it, and what changed (e.g., "Status: New → Video Shot" or "Updated: customerName, service")
4. No manual refresh needed — the timeline updates automatically after any status change

### Viewing Platform URLs

1. If a task has saved URLs (from Uploaded → Task Completed), they appear in the **URLs** section below the photo
2. Each URL shows its platform (Instagram, YouTube, etc.) and a clickable link
3. Click opens the URL in a new tab

### Comments

1. Open task detail
2. Scroll to Comments section
3. Type and press Enter or click Send
4. Comment triggers notification for all team members

### Shot List

1. Open task detail
2. Add shot items (e.g., "Drone shot of venue")
3. Check off as completed
4. Shows who checked each item and when

### Kanban Board

1. Click **Kanban** in navigation
2. View all tasks in columns by status
3. **Pull down** from top to refresh (pull-to-refresh — mobile)
4. Hover over a card → quick-move buttons appear
5. Click a card → opens task detail
6. Overdue tasks show red warning
7. Photo thumbnails (20×20px) appear in the meta row for tasks with photos

### History

1. Click **History** in navigation
2. Search by customer name or Task ID
3. Shows tasks completed more than 24 hours ago

### Notifications

1. Bell icon in header shows unread count
2. Click to view all notifications
3. **Eye icon** on each row: toggle read/unread
4. **Mark All Read** button: clears all
5. Click notification → opens task detail

### Settings

1. Click the **⋮** icon (top-right, next to profile avatar)
2. **Settings** — opens the `/settings` page
3. **Enable Notifications** (shown only if not yet asked): click to opt in to push notifications
4. App version displayed at the bottom of the page (v1.0.1)

### Analytics (Admin only)

1. Click **Analytics** in navigation
2. View total tasks, influencer ratio, completed count
3. Status distribution bar chart
4. Service breakdown
5. Monthly trends

### User Management (Admin only)

1. Click **⋮** → **User Management** (only visible for admin/su)
2. **Add User:** Fill username, password, role
3. **Change Password:** Enter username + new password
4. **Delete:** Trash icon on user row
5. 🔒 Locked users (su) cannot be modified

### Dark/Light Mode

1. Click ☀️/🌙 button in header
2. Preference saved in browser
3. All pages support both themes

### PWA Installation

1. Open in Chrome/Safari on mobile
2. Tap "Add to Home Screen"
3. App installs with bookmark icon
4. Notification badge shows on app icon
5. Push notifications arrive even when app is closed
6. **First time?** Open Settings (⋮) and tap **Enable Notifications** to opt in

### Image Preview (All Views)

Any photo thumbnail on the site supports three interaction modes:

- **Mobile long-press (~300ms):** A centered preview appears with a dark backdrop. Lift your finger to dismiss.
- **Desktop hover (~350ms):** A tooltip preview appears near the icon. Move your cursor away to dismiss.
- **Quick tap/click:** Opens a full-screen lightbox with:
  - Download button (top-left)
  - Close button (top-right, 48×48px)
  - Tap the dark background or press `Esc` to close
  - Pinch/scroll not needed — images are contained to fit the screen
