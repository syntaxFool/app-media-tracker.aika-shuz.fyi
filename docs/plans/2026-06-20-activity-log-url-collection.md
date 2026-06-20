# Activity Log, Status Confirm & URL Collection — Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Add detailed activity logging, status-change confirmation dialogs, and a URL collection step when tasks are completed.

**Architecture:** New `ActivityLog` and `TaskUrl` Prisma models feed into the task detail page. The PUT route creates log entries on every update. Frontend adds a confirmation dialog before status changes and a URL popup on the Uploaded→TaskCompleted transition.

**Tech Stack:** Next.js 14 App Router, Prisma (PostgreSQL), React 18, TypeScript, Tailwind CSS, lucide-react

---

## Task 0: Database Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add ActivityLog and TaskUrl models to schema**

Add these two models to `prisma/schema.prisma` (after the `PushSubscription` model):

```prisma
model ActivityLog {
  id        Int      @id @default(autoincrement())
  taskId    String   @map("task_id")
  actor     String
  action    String   // "status_change" | "field_update" | "created" | "comment" | "photo_added" | "photo_removed"
  detail    String   // e.g. "Status: New → Video Shot" or "Updated: customerName, service" or "Photo added"
  metadata  Json?    // arbitrary extra data e.g. {oldStatus, newStatus, fields:["customerName","service"]}
  createdAt DateTime @default(now()) @map("created_at")

  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@map("activity_logs")
}

model TaskUrl {
  id       Int    @id @default(autoincrement())
  taskId   String @map("task_id")
  platform String // "Instagram" | "YouTube Shorts" | "YouTube" | "Snapchat" | "Facebook" | "Google Business Profile" | "Custom"
  url      String
  label    String? // custom label when platform = "Custom"

  task     Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@map("task_urls")
}
```

Also add the relation fields to the `Task` model:

```prisma
model Task {
  // ... existing fields ...
  activityLogs ActivityLog[]
  urls         TaskUrl[]
}
```

**Step 2: Push migration to dev database**

```bash
npx prisma db push
```

**Step 3: Verify**

```bash
npx prisma studio
# Check that activity_logs and task_urls tables exist
```

**Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add ActivityLog and TaskUrl models for audit trail and URL storage"
```

---

## Task 1: API — Enhanced Activity Logging

**TDD scenario:** Modifying tested code — the PUT route already exists. Verify it compiles after changes.

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts`

**Step 1: Import Prisma at top of PUT handler**

The PUT handler already imports `prisma`. No import changes needed.

**Step 2: Add activity logging to staff status update (lines ~46-57)**

After `const updated = await prisma.task.update(...)` and before `return NextResponse.json({ task: updated })`, add:

```typescript
// Log the status change
await prisma.activityLog.create({
  data: {
    taskId: params.id,
    actor: session.username,
    action: "status_change",
    detail: `Status: ${task.status} → ${status}`,
    metadata: { oldStatus: task.status, newStatus: status },
  },
});
```

Also log a notification that includes the old→new status (already done, verified).

**Step 3: Add activity logging to admin status update (lines ~60-86)**

After the existing WhatsApp/Notification block, add the same ActivityLog creation. For admin metadata-only updates (no status change), detect which fields changed by comparing body values to existing task values:

```typescript
// After all field updates are applied
if (status !== undefined && status !== task.status) {
  // ... existing WhatsApp + notification ...
  await prisma.activityLog.create({
    data: {
      taskId: params.id,
      actor: session.username,
      action: "status_change",
      detail: `Status: ${task.status} → ${status}`,
      metadata: { oldStatus: task.status, newStatus: status },
    },
  });
} else {
  // Log field-level changes
  const changedFields: string[] = [];
  if (customerName !== undefined && customerName !== task.customerName) changedFields.push("customerName");
  if (service !== undefined && service !== task.service) changedFields.push("service");
  if (gender !== undefined && gender !== task.gender) changedFields.push("gender");
  if (isInfluencer !== undefined && isInfluencer !== task.isInfluencer) changedFields.push("isInfluencer");
  if (note !== undefined && note !== task.note) changedFields.push("note");
  if (shootDate !== undefined) changedFields.push("shootDate");
  if (dueDate !== undefined) changedFields.push("dueDate");
  if (photoPath !== undefined && photoPath !== task.photoPath) {
    changedFields.push(photoPath ? "photo_added" : "photo_removed");
  }
  if (assignedTo !== undefined) changedFields.push("assignedTo");
  if (changedFields.length > 0) {
    await prisma.activityLog.create({
      data: {
        taskId: params.id,
        actor: session.username,
        action: "field_update",
        detail: `Updated: ${changedFields.join(", ")}`,
        metadata: { fields: changedFields },
      },
    });
  }
}
```

**Step 4: Verify by building**

```bash
npx next build
```

Expected: Compiles successfully, no type errors.

**Step 5: Commit**

```bash
git add src/app/api/tasks/[id]/route.ts
git commit -m "feat: create ActivityLog entries on every task update"
```

---

## Task 2: API — Task URL Endpoints

**TDD scenario:** New endpoints — write the full implementation.

**Files:**
- Create: `src/app/api/tasks/[id]/urls/route.ts`

**Step 1: Create the URL CRUD endpoint**

```typescript
// GET/POST/DELETE /api/tasks/[id]/urls
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const PLATFORMS = [
  "Instagram", "YouTube Shorts", "YouTube", "Snapchat",
  "Facebook", "Google Business Profile", "Custom",
];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const urls = await prisma.taskUrl.findMany({
      where: { taskId: params.id },
      orderBy: { id: "asc" },
    });
    return NextResponse.json({ urls });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const { platform, url, label } = await req.json();
    if (!platform || !PLATFORMS.includes(platform))
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    if (!url || typeof url !== "string")
      return NextResponse.json({ error: "URL required" }, { status: 400 });

    const created = await prisma.taskUrl.create({
      data: { taskId: params.id, platform, url, label: platform === "Custom" ? label : null },
    });

    // Log the URL addition
    await prisma.activityLog.create({
      data: {
        taskId: params.id,
        actor: session.username,
        action: "field_update",
        detail: `Added ${platform} URL: ${url}`,
        metadata: { platform, url },
      },
    });

    return NextResponse.json({ url: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const { urlId } = await req.json();
    if (!urlId) return NextResponse.json({ error: "urlId required" }, { status: 400 });
    await prisma.taskUrl.delete({ where: { id: urlId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

**Step 2: Verify build**

```bash
npx next build
```

**Step 3: Commit**

```bash
git add src/app/api/tasks/[id]/urls/
git commit -m "feat: add TaskUrl CRUD endpoint for saving platform URLs"
```

---

## Task 3: Frontend — Status Confirmation Dialog

**TDD scenario:** Modifying the StatusButtons component to add a confirmation step.

**Files:**
- Modify: `src/components/status-buttons.tsx`

**Step 1: Add confirmation state and dialog to StatusButtons**

After the `handleClick` function, add a `confirmStatus` state and a confirmation dialog. Replace the button content with a two-step flow:

```typescript
const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

async function handleConfirm() {
  if (!confirmStatus) return;
  setUpdating(confirmStatus);
  try { await onUpdate(confirmStatus); } finally {
    setUpdating(null);
    setConfirmStatus(null);
  }
}
```

Change each button's `onClick` from `handleClick(status)` to `() => setConfirmStatus(status)`.

Add the confirmation dialog after the buttons div:

```tsx
{confirmStatus && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setConfirmStatus(null)}>
    <div className="bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-sm p-6 shadow-elev-dialog animate-slide-up" onClick={e => e.stopPropagation()}>
      <h3 className="text-heading-3 text-fg-primary mb-2">Save changes?</h3>
      <p className="text-small text-fg-secondary mb-6">
        Move task to <span className="font-[590] text-fg-primary">{confirmStatus}</span>?
      </p>
      <div className="flex gap-3">
        <button onClick={() => setConfirmStatus(null)} className="btn-ghost flex-1">Cancel</button>
        <button onClick={handleConfirm} className="btn-primary flex-1">Save</button>
      </div>
    </div>
  </div>
)}
```

Add this CSS animation to `globals.css`:

```css
.animate-slide-up {
  animation: slide-up 0.2s cubic-bezier(0.2, 0, 0, 1);
}
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

**Step 2: Verify build**

```bash
npx next build
```

**Step 3: Test manually in dev**

- Open a task as an assigned staff user
- Click a "Move to X" button
- Confirm the dialog appears with "Save changes?" and cancel/save buttons
- Click Save → status updates
- Click Cancel → dialog dismisses

**Step 4: Commit**

```bash
git add src/components/status-buttons.tsx src/app/globals.css
git commit -m "feat: add confirmation dialog before status changes"
```

---

## Task 4: Frontend — Enhanced Activity Section

**TDD scenario:** Replacing the static updatedBy/updatedAt display with a dynamic ActivityLog list.

**Files:**
- Modify: `src/app/tasks/[id]/page.tsx`

**Step 1: Fetch activity logs**

Add to the existing `useEffect` that fetches data:

```typescript
useEffect(() => {
  fetchTask(); fetchComments(); fetchShotItems(); fetchActivity();
  // ... existing auth fetch ...
}, [...]);

const [activities, setActivities] = useState<any[]>([]);

const fetchActivity = useCallback(async () => {
  const res = await fetch(`/api/tasks/${taskId}/activity`);
  if (res.ok) setActivities((await res.json()).activities);
}, [taskId]);
```

**Step 2: Create activity API endpoint**

Create `src/app/api/tasks/[id]/activity/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const activities = await prisma.activityLog.findMany({
      where: { taskId: params.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ activities });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

**Step 3: Replace the Activity section in the task detail page**

Replace lines ~137-142 (the static `updatedBy`/`updatedAt` block) with:

```tsx
{/* Activity */}
<div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 space-y-3 shadow-sm">
  <p className="text-label text-fg-tertiary">Activity</p>
  {activities.length === 0 && (
    <p className="text-caption text-fg-quaternary">No activity recorded yet.</p>
  )}
  {activities.map((a) => (
    <div key={a.id} className="flex gap-3 text-caption">
      <span className="text-fg-quaternary dark:text-gray-500 flex-shrink-0 w-[120px]">
        {new Date(a.createdAt).toLocaleString("en-IN")}
      </span>
      <span className="text-fg-secondary dark:text-gray-300">
        <span className="text-fg-primary dark:text-gray-100 font-[510]">{a.actor}</span>
        {" "}{a.detail}
      </span>
    </div>
  ))}
</div>
```

**Step 4: Verify build**

```bash
npx next build
```

**Step 5: Commit**

```bash
git add src/app/tasks/[id]/page.tsx src/app/api/tasks/[id]/activity/
git commit -m "feat: replace static activity with dynamic ActivityLog timeline"
```

---

## Task 5: Frontend — URL Collection Popup (Uploaded→Task Completed)

**TDD scenario:** New component + integration into the task detail page.

**Files:**
- Create: `src/components/url-collector.tsx`
- Modify: `src/app/tasks/[id]/page.tsx`

**Step 1: Create the UrlCollector component**

```typescript
"use client";

import { useState } from "react";
import { Plus, X, Link as LinkIcon, Globe, ExternalLink } from "lucide-react";

const PLATFORMS = [
  "Instagram", "YouTube Shorts", "YouTube", "Snapchat",
  "Facebook", "Google Business Profile", "Custom",
];

interface UrlEntry {
  platform: string;
  url: string;
  label?: string;
}

interface UrlCollectorProps {
  taskId: string;
  onComplete: (urls: UrlEntry[]) => Promise<void>;
  onCancel: () => void;
}

export default function UrlCollector({ taskId, onComplete, onCancel }: UrlCollectorProps) {
  const [entries, setEntries] = useState<UrlEntry[]>([{ platform: "Instagram", url: "" }]);
  const [submitting, setSubmitting] = useState(false);

  function addEntry() {
    setEntries([...entries, { platform: "Instagram", url: "" }]);
  }

  function removeEntry(index: number) {
    setEntries(entries.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, field: keyof UrlEntry, value: string) {
    setEntries(entries.map((e, i) => i === index ? { ...e, [field]: value } : e));
  }

  async function handleSubmit() {
    const valid = entries.filter(e => e.url.trim());
    if (valid.length === 0) return;
    setSubmitting(true);
    try {
      for (const e of valid) {
        await fetch(`/api/tasks/${taskId}/urls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: e.platform, url: e.url.trim(), label: e.label }),
        });
      }
      await onComplete(valid);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center animate-fade-in" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-6 shadow-elev-dialog max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink className="w-5 h-5 text-primary" />
          <h3 className="text-heading-3 text-fg-primary">Add Final URLs</h3>
        </div>
        <p className="text-caption text-fg-secondary mb-4">Add platform URLs before completing the task.</p>

        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={i} className="flex gap-2 items-start">
              <select
                value={entry.platform}
                onChange={e => updateEntry(i, "platform", e.target.value)}
                className="select-linear text-label py-1.5 w-[160px] flex-shrink-0 bg-white dark:bg-gray-800"
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="flex-1 space-y-1">
                <input
                  type="url"
                  value={entry.url}
                  onChange={e => updateEntry(i, "url", e.target.value)}
                  className="input-linear w-full text-sm py-1.5"
                  placeholder={entry.platform === "Custom" ? "Label" : "https://..."}
                />
                {entry.platform === "Custom" && (
                  <input
                    type="text"
                    value={entry.label || ""}
                    onChange={e => updateEntry(i, "label", e.target.value || "")}
                    className="input-linear w-full text-sm py-1.5"
                    placeholder="Custom label (e.g. Portfolio site)"
                  />
                )}
              </div>
              {entries.length > 1 && (
                <button onClick={() => removeEntry(i)} className="p-1.5 text-fg-quaternary hover:text-danger flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button onClick={addEntry} className="mt-3 flex items-center gap-1.5 text-label text-primary hover:text-primary-hover transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add URL
        </button>

        <div className="flex gap-3 mt-6 pt-4 border-t border-border dark:border-gray-700">
          <button onClick={onCancel} className="btn-ghost flex-1">Skip</button>
          <button onClick={handleSubmit} disabled={submitting || entries.every(e => !e.url.trim())} className="btn-primary flex-1">
            {submitting ? "Saving..." : "Save & Complete"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Integrate UrlCollector into task detail page**

In `src/app/tasks/[id]/page.tsx`:

Add state:
```typescript
const [showUrlCollector, setShowUrlCollector] = useState(false);
```

Import UrlCollector.

Modify `handleStatusUpdate` to intercept Uploaded→TaskCompleted:
```typescript
async function handleStatusUpdate(newStatus: string) {
  if (newStatus === "Task Completed" && task.status === "Uploaded") {
    setShowUrlCollector(true);
    return;
  }
  await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:newStatus}) });
  await fetchTask();
}

async function handleUrlCollectionComplete() {
  setShowUrlCollector(false);
  // Now complete the task
  await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:"Task Completed"}) });
  await fetchTask();
}
```

Add the UrlCollector component at the bottom of the page (before `</AppLayout>`):
```tsx
{showUrlCollector && (
  <UrlCollector
    taskId={taskId}
    onComplete={handleUrlCollectionComplete}
    onCancel={() => setShowUrlCollector(false)}
  />
)}
```

**Step 3: Verify build**

```bash
npx next build
```

**Step 4: Commit**

```bash
git add src/components/url-collector.tsx src/app/tasks/[id]/page.tsx
git commit -m "feat: add URL collection popup when completing a task"
```

---

## Task 6: Display URLs on Task Detail + Activity Integration

**TDD scenario:** Add URL display section to the task detail page.

**Files:**
- Modify: `src/app/tasks/[id]/page.tsx`

**Step 1: Fetch and display URLs**

Add to the detail page's useEffect:
```typescript
const [taskUrls, setTaskUrls] = useState<any[]>([]);

const fetchUrls = useCallback(async () => {
  const res = await fetch(`/api/tasks/${taskId}/urls`);
  if (res.ok) setTaskUrls((await res.json()).urls);
}, [taskId]);
```

Add a URL display section after the photo section:
```tsx
{taskUrls.length > 0 && (
  <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm space-y-2">
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-fg-tertiary" />
      <p className="text-label text-fg-tertiary font-[510]">URLs</p>
    </div>
    {taskUrls.map((u: any) => (
      <a key={u.id} href={u.url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-primary hover:underline break-all">
        <ExternalLink className="w-3 h-3 flex-shrink-0" />
        <span className="font-[510]">{u.platform === "Custom" ? (u.label || u.platform) : u.platform}:</span>
        <span className="text-fg-secondary dark:text-gray-300">{u.url}</span>
      </a>
    ))}
  </div>
)}
```

**Step 2: Verify build**

```bash
npx next build
```

**Step 3: Commit**

```bash
git add src/app/tasks/[id]/page.tsx
git commit -m "feat: display saved URLs on task detail page"
```

---

## Task 7: Deploy to Server

**Step 1: Push schema migration**

```bash
ssh -p 2222 nas@154.84.215.26 "docker exec media-tracker-web npx prisma db push"
```

**Step 2: Sync all changed files and rebuild**

```bash
rsync -avz -e "ssh -p 2222" prisma/schema.prisma nas@154.84.215.26:/home/nas/media-tracker/prisma/schema.prisma
rsync -avz -e "ssh -p 2222" src/app/api/ src/components/ src/app/tasks/ src/app/globals.css nas@154.84.215.26:/home/nas/media-tracker/ --include='*/' --include='*.tsx' --include='*.ts' --include='*.css'
ssh -p 2222 nas@154.84.215.26 "cd /home/nas/media-tracker && docker compose up -d --build web"
```

**Step 3: Verify**

```bash
curl -s -o /dev/null -w '%{http_code}' https://app-media-tracker.aika-shuz.fyi/
# Expected: 307 (redirect to login)
```

**Step 4: Commit final state**

```bash
git add -A
git commit -m "chore: final deploy — activity logs, status confirm, URL collection"
git push
```

---

## File Change Summary

| File | Action |
|---|---|
| `prisma/schema.prisma` | Add ActivityLog + TaskUrl models + relations |
| `src/app/api/tasks/[id]/route.ts` | Add ActivityLog creation on all updates |
| `src/app/api/tasks/[id]/activity/route.ts` | **New** — GET activity logs |
| `src/app/api/tasks/[id]/urls/route.ts` | **New** — CRUD for task URLs |
| `src/components/status-buttons.tsx` | Add confirmation dialog |
| `src/components/url-collector.tsx` | **New** — URL collection popup |
| `src/app/tasks/[id]/page.tsx` | Activity section, URL display, UrlCollector integration |
| `src/app/globals.css` | Add `.animate-slide-up` keyframe |
