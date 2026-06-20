# UI/UX Polish & Bug Fix Plan

## 1. Move "+" Add Button to Bottom Navbar Center

**Files:** `src/components/layout.tsx`

- Remove "New Task" button from header
- Add centered "+" FAB button to bottom navbar (between Dashboard and Kanban)
- Style: circular, navy background, white icon, slight shadow, elevated above nav
- On mobile: larger touch target (48px+)
- Keep the icon-only button with "New Task" tooltip

## 2. Fix Header — Make It Pretty

**Files:** `src/components/layout.tsx`

- Add subtle gradient to header background (navy → slightly lighter navy)
- Better typography: letter-spacing, font weight for brand name
- Compact user area: avatar initial circle + name + logout on hover
- Smooth transitions on hover states
- Consistent padding and alignment
- Remove the `hidden sm:inline` — show name on all screens

## 3. Fix Dashboard — Make It Pretty

**Files:** `src/app/page.tsx`, `src/components/task-card.tsx`, `src/components/filter-bar.tsx`

- Add subtle empty state illustration for "No tasks"
- Card hover: lift effect with shadow transition
- Filter bar: pill-style unified design with consistent border radius
- Status counts: card-style with mini progress bars
- Better spacing rhythm (consistent 16px gaps)
- Smooth enter animations with staggered delay

## 4. Fix Kanban — Snap & Feel

**Files:** `src/app/kanban/page.tsx`

- Add `scroll-snap-type: x mandatory` + `snap-align: start` for smooth horizontal scrolling
- Column headers: sticky top within scroll container
- Card drag ghost effect on hover
- Smoother card transitions when moving between columns
- Add empty column placeholder with dashed border
- Better column width: `min(280px, 80vw)` for mobile

## 5. User Can Only Move Tasks Assigned to Them

**Files:** `src/app/api/tasks/[id]/route.ts`, `src/app/tasks/[id]/page.tsx`, `src/app/kanban/page.tsx`

- **API:** In PUT handler, check if `session.username` is in `task.assignedTo`. If not, return 403 "Not assigned to this task"
- **Exception:** Admin/su can move any task
- **Task Detail:** Hide StatusButtons for staff if not assigned; show "You are not assigned to this task" message
- **Kanban:** Hide quick-move buttons for non-assigned tasks; show "Assigned only" badge

## 6. Push Notifications Fix

**Files:** `src/lib/push.ts`, `public/sw.js`, layout push registration

- Verify `navigator.serviceWorker` registration includes push subscription
- Add auto-subscription on login: after auth, register for push
- Fix `Notification.requestPermission()` flow
- Add a "Enable Notifications" prompt in the UI
- Verify VAPID keys are correctly set in environment
- Test end-to-end: status update → browser notification appears

## 7. Remove su from Assign Staff List

**Files:** `src/components/task-form.tsx`, `src/app/api/users/route.ts`

- In task form staff picker: filter out users with `isSuperuser === true` or `role === "su"`
- Or: add a query param to `/api/users?excludeSu=true`

## 8. Fix Edit Task — Due Date & Service Disappearing

**Files:** `src/app/tasks/[id]/edit/page.tsx`, `src/components/task-form.tsx`

- **Bug A:** `service` field is missing from initialData in edit page (was accidentally dropped when inserting dueDate/assignedTo)
- **Bug B:** `dueDate` ISO string not parsed to `YYYY-MM-DD` for `<input type="date">` — needs same conversion as shootDate
- Fix: restore `service` in initialData, add `dueDate` ISO→date conversion in TaskForm
