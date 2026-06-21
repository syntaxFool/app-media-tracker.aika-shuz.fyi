# Rejection Flow & Kanban Visual Context Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Implement a rejection workflow from the "Reviewed" column back to "Data Copied" with auto-routing, visual indicators (red border, "Fix Required" pill, rejection note), auto-sort to top, and a direct "Data Copied → Reviewed" jump for the new assignee.

**Architecture:** Add a `rejectionNote` field to the Task model to track rejection state. Extend the status flow graph to support `Reviewed → Data Copied` (for admin) and conditional `Data Copied → Reviewed` (for staff when task is rejected). Modify the Kanban and dashboard card components to apply visual treatment. Guard the direct-jump status button behind the presence of a rejection note.

**Tech Stack:** Next.js 14 App Router, Prisma ORM + PostgreSQL, Tailwind CSS, Kanban board, dashboard, task detail page.

---

## Task 1: Schema — Add Rejection Fields to Task Model

**TDD scenario:** Modify existing schema + generate migration. No test needed.

**Files:**
- Modify: `prisma/schema.prisma` (Task model, add rejection fields)

**Change:** Add three fields to the `Task` model:

```prisma
rejectionNote String?  @map("rejection_note")
rejectedBy    String?  @map("rejected_by")
rejectedAt    DateTime? @map("rejected_at")
```

**Step 1:** Edit `prisma/schema.prisma` — add rejection fields after `assignedTo`.

**Step 2:** Generate and run migration:

```bash
npx prisma migrate dev --name add-rejection-fields
npx prisma generate
```

**Step 3:** Commit.

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add rejection fields to Task model"
```

---

## Task 2: Status Flow — Allow Rejection Transitions

**TDD scenario:** No existing tests for `STATUS_FLOW`. Modify the data structure.

**Files:**
- Modify: `src/lib/tasks.ts`

**Changes:**

1. Add `"Reviewed": ["Uploaded", "Data Copied"]` — allows admin to reject back to Data Copied.
2. Export a helper `isRejected(task): boolean` that checks if `rejectionNote` is non-null.
3. Export a helper `getNextStatuses(task, userRole, currentUsername): string[]` that:
   - For admin/su: returns `STATUS_FLOW[status]` (full bidirectional)
   - For staff: returns forward statuses from `STATUS_FLOW` normally, BUT if task has `rejectionNote` and current status is `Data Copied`, also includes `"Reviewed"` as an additional allowed transition

```typescript
// In src/lib/tasks.ts
export function isRejected(task: { rejectionNote?: string | null }): boolean {
  return !!task.rejectionNote;
}

export function getAllowedNextStatuses(
  task: { status: string; rejectionNote?: string | null },
  role: string,
): string[] {
  const base = STATUS_FLOW[task.status] || [];

  if (role === "admin" || role === "su") {
    // Admin gets the full STATUS_FLOW (which now includes Reviewed→Data Copied)
    return base;
  }

  // Staff: forward-only
  if (isRejected(task) && task.status === "Data Copied") {
    return [...base, "Reviewed"];
  }

  return base;
}
```

**Step 1:** Edit `src/lib/tasks.ts` — add `Reviewed → Data Copied` to STATUS_FLOW.

**Step 2:** Add `isRejected()` and `getAllowedNextStatuses()` export functions.

**Step 3:** Commit.

```bash
git add src/lib/tasks.ts
git commit -m "feat: extend status flow with rejection transitions"
```

---

## Task 3: API — Handle Rejection Notes and Restore Flow

**TDD scenario:** Modify existing route handler. Verify with manual curl tests.

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts`

**Changes:**

### 3a: Admin rejection path (Reviewed → Data Copied with rejectionNote)

In the admin PUT handler, add handling for `rejectionNote` when status changes to `Data Copied`:

```typescript
// In the admin block, after statusChanged detection:
if (status === "Data Copied" && task.status === "Reviewed") {
  // Rejection flow
  if (!body.rejectionNote || !body.rejectionNote.trim()) {
    return NextResponse.json(
      { error: "Rejection note is required when moving from Reviewed to Data Copied" },
      { status: 400 }
    );
  }
  updateData.rejectionNote = body.rejectionNote;
  updateData.rejectedBy = session.username;
  updateData.rejectedAt = new Date();
}
```

### 3b: Staff restore path (Data Copied → Reviewed clears rejection)

When staff moves a rejected task from Data Copied to Reviewed, clear the rejection fields:

```typescript
// In the staff block, after detecting the transition:
if (status === "Reviewed" && task.status === "Data Copied" && task.rejectionNote) {
  // Restore: clear rejection flags
  updateData.rejectionNote = null;
  updateData.rejectedBy = null;
  updateData.rejectedAt = null;
}
```

### 3c: Staff transition validation update

Update the staff validation block to allow Data Copied → Reviewed when task is rejected:

```typescript
// In staff validation section, replace:
if (!isValidTransition(task.status, status))
  return NextResponse.json(...);

// With:
const allowedStatuses = getAllowedNextStatuses(task, session.role);
if (!allowedStatuses.includes(status))
  return NextResponse.json(
    { error: `Cannot move from "${task.status}" to "${status}"` },
    { status: 400 }
  );
```

**Step 1:** Modify `src/app/api/tasks/[id]/route.ts` — add rejection note validation and storage.

**Step 2:** Modify staff block to use `getAllowedNextStatuses` and handle rejection clearing.

**Step 3:** Commit.

```bash
git add src/app/api/tasks/[id]/route.ts
git commit -m "feat: handle rejection note in API and restore path"
```

---

## Task 4: Kanban — Auto-Sort, Red Border, Fix Required Pill, Rejection Note

**TDD scenario:** Visual changes, no tests. Manual verification in browser.

**Files:**
- Modify: `src/app/kanban/page.tsx`

**Changes:**

### 4a: Import isRejected
```typescript
import { STATUS_FLOW, ALL_STATUSES, isRejected } from "@/lib/tasks";
```

### 4b: Sort tasks within Data Copied column — rejected first
```typescript
const colTasks = tasks.filter((t) => t.status === status)
  .sort((a, b) => {
    if (status === "Data Copied") {
      const aRej = isRejected(a) ? 0 : 1;
      const bRej = isRejected(b) ? 0 : 1;
      return aRej - bRej;
    }
    return 0;
  });
```

### 4c: Red border + "Fix Required" pill on rejected cards

Inside the card rendering (`col.tasks.map(task => ...)`), add conditional classes:

```typescript
const isRejectedTask = isRejected(task);

// On the outer card div, add:
className={`... ${isRejectedTask ? "border-danger/50 ring-1 ring-danger/20" : ""} ...`}
```

### 4d: "Fix Required" pill above the customer name

```typescript
{isRejectedTask && (
  <div className="flex items-center gap-1.5 mb-1.5">
    <span className="text-micro font-[590] text-white bg-danger px-2 py-0.5 rounded-pill">
      Fix Required
    </span>
    <span className="text-tiny text-danger font-mono">
      by {task.rejectedBy}
    </span>
  </div>
)}
```

### 4e: Rejection note snippet on the card face

```typescript
{isRejectedTask && task.rejectionNote && (
  <div className="mt-1.5 mb-1.5 text-tiny text-fg-quaternary dark:text-gray-400 bg-danger/5 border border-danger/10 rounded-sm px-2 py-1.5 italic line-clamp-2">
    "{task.rejectionNote}"
  </div>
)}
```

### 4f: Update quick-move buttons to use getAllowedNextStatuses

Replace the inline `STATUS_FLOW` slice with the new helper:

```typescript
import { getAllowedNextStatuses } from "@/lib/tasks";

// In quick-move section:
const allowed = getAllowedNextStatuses(task, userRole).slice(0, 3);
```

Note: The kanban page needs to know the user's role. Add a `userRole` state:

```typescript
const [userRole, setUserRole] = useState("staff");

useEffect(() => {
  fetch("/api/auth/me").then(r => { if(r.ok) r.json().then(d => setUserRole(d.user.role)); }).catch(() => {});
}, []);
```

**Step 1:** Import `isRejected` and `getAllowedNextStatuses` in kanban page.

**Step 2:** Add `userRole` state and fetch on mount.

**Step 3:** Add sort logic for Data Copied column.

**Step 4:** Add red border, "Fix Required" pill, and rejection note to cards.

**Step 5:** Update quick-move buttons to use `getAllowedNextStatuses`.

**Step 6:** Commit.

```bash
git add src/app/kanban/page.tsx
git commit -m "feat: kanban auto-sort, red border, fix-required pill, rejection note"
```

---

## Task 5: Dashboard Task Card — Show Rejection Indicators

**TDD scenario:** Visual changes, no tests.

**Files:**
- Modify: `src/components/task-card.tsx`

**Changes:**

### 5a: Import isRejected
```typescript
import { isRejected } from "@/lib/tasks";
```

### 5b: Add rejection visual indicators to the card

Same pattern as kanban:

- Red border: `isRejected(task) ? "border-danger/50 ring-1 ring-danger/20" : "border-border..."`
- "Fix Required" pill next to or above customer name (or alongside the StatusBadge)
- Rejection note snippet with line-clamp-2 italic styling

```typescript
const rejected = isRejected(task as any);

// Classes on outer div:
className={`... ${rejected ? "border-danger/50 ring-1 ring-danger/20" : overdue ? "border-danger/30" : selected ? "border-accent" : "border-border"} ...`}

// "Fix Required" pill (add after the isOverdue badge or alongside StatusBadge):
{rejected && (
  <span className="text-micro bg-danger text-white px-1.5 py-0.5 rounded-pill font-[590] flex-shrink-0">
    Fix Required
  </span>
)}

// Rejection note (add before or after assigned staff row):
{rejected && task.rejectionNote && (
  <div className="text-tiny text-fg-quaternary bg-danger/5 border border-danger/10 rounded-sm px-2 py-1 italic line-clamp-1">
    "{task.rejectionNote}"
  </div>
)}
```

**Step 1:** Import `isRejected` in task-card.tsx.

**Step 2:** Add border styling, "Fix Required" pill, and rejection note.

**Step 3:** Commit.

```bash
git add src/components/task-card.tsx
git commit -m "feat: show rejection indicators on dashboard task cards"
```

---

## Task 6: Task Detail Page — Rejection Modal for Admin + Rejection Info Display

**TDD scenario:** Visual changes, no tests. Manual verification.

**Files:**
- Modify: `src/app/tasks/[id]/page.tsx`

**Changes:**

### 6a: Add rejection modal state
```typescript
const [showRejectionModal, setShowRejectionModal] = useState(false);
const [rejectionNote, setRejectionNote] = useState("");
const [rejectionSubmitting, setRejectionSubmitting] = useState(false);
```

### 6b: Intercept admin dropdown when selecting "Data Copied" from "Reviewed"

In the admin dropdown onChange handler, detect the rejection scenario:

```typescript
onChange={(e) => {
  const newStatus = e.target.value;
  if (newStatus !== task.status) {
    // If moving from Reviewed → Data Copied, show rejection modal
    if (task.status === "Reviewed" && newStatus === "Data Copied") {
      setShowRejectionModal(true);
      setPendingAdminStatus(newStatus); // need a state for this
    } else {
      setConfirmAdminStatus(newStatus);
    }
  }
}}
```

Add state: `const [pendingAdminStatus, setPendingAdminStatus] = useState<string | null>(null);`

Wait, I need to reconsider. Looking at the current code:

```tsx
<select
  defaultValue={task.status}
  onChange={(e) => {
    if (e.target.value !== task.status) setConfirmAdminStatus(e.target.value);
  }}
  className="select-linear flex-1"
>
```

The simplest approach: when admin selects "Data Copied" from "Reviewed", instead of showing the confirmation dialog, show the rejection modal. The rejection modal includes a note field and the same Save/Cancel buttons.

### 6c: Rejection modal component

After the existing `confirmAdminStatus` dialog:

```tsx
{showRejectionModal && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center animate-fade-in"
    onClick={() => { if (!rejectionSubmitting) setShowRejectionModal(false); }}>
    <div className="bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-sm p-6 shadow-elev-dialog animate-slide-up"
      onClick={e => e.stopPropagation()}>
      <h3 className="text-heading-3 text-fg-primary mb-2">Reject Task</h3>
      <p className="text-small text-fg-secondary mb-4">
        Move <span className="font-mono">{task.id}</span> from <strong>Reviewed</strong> back to <strong>Data Copied</strong>.
      </p>
      <textarea
        value={rejectionNote}
        onChange={(e) => setRejectionNote(e.target.value)}
        className="input-linear w-full text-sm p-3 min-h-[100px] mb-4"
        placeholder="Describe what needs to be fixed..."
        autoFocus
      />
      <div className="flex gap-3">
        <button
          onClick={() => { setShowRejectionModal(false); setRejectionNote(""); }}
          className="btn-ghost flex-1"
          disabled={rejectionSubmitting}
        >Cancel</button>
        <button
          onClick={async () => {
            if (!rejectionNote.trim()) return;
            setRejectionSubmitting(true);
            await fetch(`/api/tasks/${taskId}`, {
              method: "PUT",
              headers: {"Content-Type":"application/json"},
              body: JSON.stringify({ status: "Data Copied", rejectionNote: rejectionNote.trim() }),
            });
            setRejectionSubmitting(false);
            setShowRejectionModal(false);
            setRejectionNote("");
            await fetchTask();
            await fetchActivity();
          }}
          className="btn-danger flex-1"
          disabled={rejectionSubmitting || !rejectionNote.trim()}
        >
          {rejectionSubmitting ? "Rejecting..." : "Reject & Send Back"}
        </button>
      </div>
    </div>
  </div>
)}
```

### 6d: Show rejection info on the detail page

Add a prominent rejection banner between the header and the details section when task has rejectionNote:

```tsx
{task.rejectionNote && (
  <div className="bg-danger/5 border border-danger/20 rounded-md p-4">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-micro font-[590] text-white bg-danger px-2 py-0.5 rounded-pill">
        Fix Required
      </span>
      {task.rejectedBy && (
        <span className="text-tiny text-fg-quaternary">
          Rejected by {task.rejectedBy} on {new Date(task.rejectedAt).toLocaleDateString("en-IN")}
        </span>
      )}
    </div>
    <p className="text-sm text-fg-secondary italic">"{task.rejectionNote}"</p>
  </div>
)}
```

### 6e: Status buttons for staff — handle direct jump to Reviewed

The `StatusButtons` component is already used for staff. It receives `nextStatuses` from the parent. In the task detail page, replace:

```tsx
const nextStatuses = NEXT_STATUS[task.status] || [];
```

With:

```tsx
import { getAllowedNextStatuses } from "@/lib/tasks";

const nextStatuses = getAllowedNextStatuses(task, userRole);
```

This way, when the task is rejected and status is "Data Copied", `getAllowedNextStatuses` will include "Reviewed" alongside the forward "Video Edited".

**Step 1:** Add rejection modal state and the "Reject" dialog JSX.

**Step 2:** Modify the admin onChange to show rejection modal on Reviewed→Data Copied.

**Step 3:** Add rejection info banner on the task detail page.

**Step 4:** Import `getAllowedNextStatuses` and use it instead of `NEXT_STATUS[task.status]`.

**Step 5:** Commit.

```bash
git add src/app/tasks/[id]/page.tsx
git commit -m "feat: rejection modal on detail page and rejection info banner"
```

---

## Task 7: Prisma Migration + Generate Client

**TDD scenario:** No test. Run migration commands.

**Step 1:** Run migration:

```bash
npx prisma migrate dev --name add-rejection-fields
```

**Step 2:** Generate client:

```bash
npx prisma generate
```

**Step 3:** Verify the generated types include `rejectionNote`, `rejectedBy`, `rejectedAt` on the Task type.

**Step 4:** Commit the migration.

```bash
git add prisma/migrations/
git commit -m "chore: generate prisma migration for rejection fields"
```

---

## Summary of All Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `rejectionNote`, `rejectedBy`, `rejectedAt` to Task model |
| `prisma/migrations/...` | Auto-generated migration |
| `src/lib/tasks.ts` | Add `Reviewed→Data Copied` to STATUS_FLOW; add `isRejected()`, `getAllowedNextStatuses()` |
| `src/app/api/tasks/[id]/route.ts` | Handle rejection note on Reviewed→Data Copied; clear rejection on restore; update validation |
| `src/app/kanban/page.tsx` | Auto-sort rejected to top; red border; Fix Required pill; rejection note; updated quick-move |
| `src/components/task-card.tsx` | Red border; Fix Required pill; rejection note snippet |
| `src/app/tasks/[id]/page.tsx` | Rejection modal for admin; rejection info banner; use `getAllowedNextStatuses` |

## Verification Checklist

1. [ ] Admin opens a task in "Reviewed" status, selects "Data Copied" from dropdown → sees rejection modal with textarea
2. [ ] Admin submits rejection with note → task moves to Data Copied, rejection note is saved
3. [ ] Admin submits rejection without a note → sees error message
4. [ ] On Kanban, rejected tasks in Data Copied appear at the top of the column
5. [ ] Rejected task cards in Kanban have red border + "Fix Required" pill + rejection note snippet
6. [ ] Same visual indicators appear on the Dashboard task cards
7. [ ] Staff assignee opens the rejected task → StatusButtons shows "Move to Reviewed" option (alongside "Move to Video Edited")
8. [ ] Staff clicks "Move to Reviewed" → task moves to Reviewed, rejection fields are cleared
9. [ ] Once rejection is resolved, the card no longer shows red border / Fix Required pill
