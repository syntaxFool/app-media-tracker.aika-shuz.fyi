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

### Creating a Task

1. Click **New Task** (top right) — available to all roles
2. Fill Customer Name, Shoot Date, **Due Date** (required)
3. Select Service and Gender
4. Toggle Influencer if applicable
5. **Assign Staff** (admin/su only): Click staff names to add/remove. su MUST assign at least one
6. Upload photo (auto-compresses to ~1MB)
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
3. Status updates trigger: in-app notification + browser push + WhatsApp message

### Updating Status (Admin/su)

1. Open task detail
2. Use the **status dropdown** to pick ANY status (forward or backward)
3. No flow restrictions for admin/su

### Ping Admin (Staff)

If you accidentally update to the wrong status:
1. Open task detail
2. Click **Ping Admin**
3. Confirm the dialog
4. WhatsApp alert + in-app notification sent to admin

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
3. Hover over a card → quick-move buttons appear
4. Click a card → opens task detail
5. Overdue tasks show red warning

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

### Analytics (Admin only)

1. Click **Analytics** in navigation
2. View total tasks, influencer ratio, completed count
3. Status distribution bar chart
4. Service breakdown
5. Monthly trends

### User Management (Admin only)

1. Click **Users** in navigation
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
