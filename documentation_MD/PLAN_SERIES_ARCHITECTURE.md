# Implementation Plan: Parent-Child Series Architecture

> **Status:** Draft  
> **Date:** 2025-06-25  
> **Inspired by:** YouTube's Official Series Playlist architecture

---

## Overview

Add a **Series** (Parent-Child) model to the Task entity so multi-part video projects (e.g., "Wedding Film Part 1", "Wedding Film Part 2") can be grouped, ordered, and tracked independently through the Kanban workflow.

Each Task remains an independent database row with its own status, analytics, and metadata. A nullable `seriesId` + `partNumber` pair links them into one logical container — exactly how YouTube models "Official Series Playlists."

| YouTube Concept | Our Implementation |
|---|---|
| Official Series Playlist (parent container) | `seriesId` on Task row groups siblings |
| Each video = independent `content_id` row | Each Task = independent row with its own `status` |
| `sequence_index` (1, 2, 3) | `partNumber` (1, 2, 3) |
| End Screens / Info Cards (UI bridging) | Series context widget in Task detail + Kanban grouping |
| One video per Official Series | One Task per `(seriesId, partNumber)` pair |

---

## Schema Changes

### 1. Prisma Migration — Two new fields on `Task`

```prisma
model Task {
  // ... existing fields ...

  seriesId    String?  @map("series_id")    // groups related tasks (UUID or human-readable key)
  partNumber  Int?     @map("part_number")  // 1, 2, 3 within a series

  // ... existing relations ...

  @@index([seriesId])           // fast grouping for dashboard & kanban
  @@index([seriesId, partNumber]) // unique ordering within a series (not unique constraint — parts can be renumbered)
  @@map("tasks")
}
```

**Design decisions:**
- Both fields are **nullable** — existing tasks don't break, and single-part tasks stay un-grouped
- `seriesId` is a `String` (not Int) so it can hold a UUID or a human-readable slug like `"wedding-sharma-2025"`
- `partNumber` is `Int?` (not auto-increment) — the user explicitly assigns part order
- No separate `Series` table needed yet — the series is defined implicitly by shared `seriesId`. A Series table could be added later for metadata (title, description), but is premature optimization for MVP

### 2. Migration File

Run `npx prisma migrate dev --name add_series_fields` to generate the migration.

---

## API Layer

### 3. GET `/api/tasks` — Include series metadata in list response

**File:** `src/app/api/tasks/route.ts`

When tasks have `seriesId`, the response should include:
```json
{
  "task": {
    "id": "SHANUZZ-0042",
    "seriesId": "series_wedding_sharma_2025",
    "partNumber": 1,
    "seriesTotal": 3,        // computed: count of tasks with same seriesId
    "seriesStatuses": [      // computed: statuses of all siblings
      "Task Completed",
      "Video Edited",
      "New"
    ]
  }
}
```

Return `seriesTotal` and `seriesStatuses` only when `seriesId` is non-null (avoids extra queries for simple tasks).

**Implementation:** After fetching tasks, batch-fetch series info:
```typescript
// Collect non-null seriesIds
const seriesIds = [...new Set(tasks.filter(t => t.seriesId).map(t => t.seriesId!))];
// Fetch sibling counts & statuses in one query per series
const seriesInfo = await Promise.all(
  seriesIds.map(async (sid) => {
    const siblings = await prisma.task.findMany({
      where: { seriesId: sid },
      select: { id: true, status: true },
    });
    return { seriesId: sid, total: siblings.length, statuses: siblings.map(s => s.status) };
  })
);
```

### 4. POST `/api/tasks` — Accept series fields on creation

**File:** `src/app/api/tasks/route.ts` (POST handler)

Add to existing body parsing:
```typescript
const { seriesId, partNumber } = body;
// Validate: partNumber requires seriesId
if (partNumber && !seriesId) {
  return NextResponse.json({ error: "partNumber requires seriesId" }, { status: 400 });
}
// Auto-compute partNumber if seriesId given but no partNumber
const computedPart = seriesId && !partNumber
  ? (await prisma.task.count({ where: { seriesId } })) + 1
  : partNumber || null;
```

Include `seriesId` and `partNumber` in `createData`.

### 5. PUT `/api/tasks/[id]` — Allow series field updates (admin only)

**File:** `src/app/api/tasks/[id]/route.ts`

Add to admin-editable fields:
```typescript
if (seriesId !== undefined) updateData.seriesId = seriesId || null;
if (partNumber !== undefined) updateData.partNumber = partNumber || null;
```

Staff cannot change series fields (only admin/su).

### 6. Series Context Logging

In `ActivityLog`, when `seriesId` or `partNumber` changes for admin, log:
```
action: "field_update"
detail: "Updated: seriesId, partNumber"
metadata: { fields: ["seriesId", "partNumber"] }
```

Already handled by the existing field-change detection logic — just add `seriesId` and `partNumber` to the field comparison block in PUT route.

---

## Task Creation Flow

### 7. Create Task Form — Series Section

**File:** `src/components/task-form.tsx` + `src/app/tasks/new/page.tsx`

Add a collapsible "Series (Multi-Part)" section to the form:

```
┌──────────────────────────────────────────┐
│ ☐ This task is part of a series          │  ← checkbox toggles fields
│                                          │
│ Series: [dropdown: existing or "New"]    │
│ Part #:  [ 1 ▼]                          │
└──────────────────────────────────────────┘
```

**Series dropdown logic:**
- Fetch existing series from `GET /api/tasks?series=1` (or a new lightweight endpoint)
- Options: list of existing `seriesId` values with count, plus "Create New Series"
- When "Create New Series" selected: show text input for series name/title
- Part number auto-suggests next available (count + 1) with manual override

**Implementation details:**
- Add a `seriesId` prop to `TaskForm`
- Show series fields conditionally when a checkbox is toggled
- `partNumber` auto-computes, but user can override
- On submit, include `seriesId` and `partNumber` in the POST body

### 8. Edit Task Form — Series Fields

**File:** `src/app/tasks/[id]/edit/page.tsx`

- Show current series context even if not editing (read-only display)
- Admin/su can change `seriesId` and `partNumber`
- Staff: fields are hidden or read-only

---

## Kanban Board (Core UX)

### 9. Series Grouping in Kanban Columns

**File:** `src/app/kanban/page.tsx`

This is the key change per the user's spec:

> "When you look at your Kanban board, the app groups everything with the same `series_id` into one visual card, but still lets you drag Part 1 to 'Published' while Part 2 stays in 'Editing'."

**Logic:** Before rendering columns, scan all tasks and collapse series-members into group objects:

```typescript
interface SeriesGroup {
  seriesId: string;
  parts: Task[];          // sorted by partNumber asc
  statusSummary: string;  // e.g. "1 done · 2 in progress"
  representativeStatus: string; // for column placement
}
```

**Column placement rules:**
- When all parts of a series share the same status → place in that column
- When parts span multiple statuses → place in the column of the **earliest** (lowest-index) status in `ALL_STATUSES` that any part occupies
- For example: Part 1 = "Task Completed", Part 2 = "Video Edited" → series card appears in "Video Edited" column

### 10. Series Card UI (Kanban)

Each series card in a Kanban column:

```
┌──────────────────────────────────────┐
│ 📹 Wedding Film — Sharma (3 parts)   │  ← expandable header
│ ▸ 2 of 3 completed                   │  ← aggregate progress
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Part 1: Ceremony  ✓ Completed   │ │  ← expand on click
│ │ Part 2: Reception   ▶ Editing   │ │
│ │ Part 3: Highlights  ● New       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Gantt mini-bar: ███████░░░░░ 66%    │
└──────────────────────────────────────┘
```

**Behavior:**
- Card is **collapsed** by default → shows header + mini-progress bar
- **Expand on click** → reveals individual part cards inside
- Each part card has its **own quick-move buttons** (hover → allowed next statuses)
- Moving one part does NOT move siblings — each part is independent
- When a part moves to a different column, the series card **re-evaluates** its column placement per rule above
- Series card "spans" — if Part 1 moved to Uploaded, the series card base moves to Part 2's column, and Part 1's card appears in the Uploaded column (with the series tag visible)
- **If only 1 part remains ungrouped** (all others in same column), the grouping dissolves into individual cards

### 11. Kanban Column Re-evaluation on Optimistic Update

**File:** `src/app/kanban/page.tsx` → `moveTask()`

After optimistic state update:
1. Update the moved task's status in local state
2. Re-run the series grouping logic
3. Re-compute column assignments

The series card should visually "jump" to the correct column based on earliest-status-part rule.

---

## Dashboard List View

### 12. Series Indicator on Task Cards

**File:** `src/components/task-card.tsx` + `src/app/page.tsx`

When a task has a `seriesId`, show on the card:

```
┌──────────────────────────────────────┐
│ Wedding Film — Sharma                │
│ Part 2 of 3  ▸ Video Edited         │  ← micro chip
│ SHANUZZ-0042 · Wedding              │
└──────────────────────────────────────┘
```

**Filter additions:**
- Filter dropdown: "Series only" toggle (show only tasks with `seriesId`)
- Optional: "Group by Series" toggle on dashboard → groups cards under collapsible headers

---

## Task Detail Page

### 13. Series Context Widget

**File:** `src/app/tasks/[id]/page.tsx`

Add a "Series" section between header and details:

```
┌────────────────────────────────────────────────┐
│ 📹 Part 2 of 3 — Wedding Film (Sharma Series) │
│                                                │
│ Part 1: Ceremony     → Task Completed          │  ← clickable links
│ Part 2: Reception    → Video Edited ◄ current  │
│ Part 3: Highlights   → New                     │
└────────────────────────────────────────────────┘
```

**Implementation:**
- When `task.seriesId` is non-null, fetch siblings from `GET /api/tasks?seriesId=X`
- Render as a compact list with status badges
- Each sibling links to its detail page
- Current task highlighted with a subtle border/background
- Part numbers shown as ordered list

### 14. URL Collector — Series Awareness

**File:** `src/components/url-collector.tsx`

When completing Part 2 of a series, optionally suggest linking to Part 1's published URLs (YouTube "End Screen" equivalent):
- Show a note: "Part 1 was published at: [URL]" (informational)

---

## Backend: Optimal API Design

### 15. GET `/api/series` — Lightweight series list

**File:** `src/app/api/series/route.ts` (new)

Returns a list of all series (distinct `seriesId` values) with:
- `seriesId`
- `totalParts`  
- `statuses` (aggregate count per status)
- `latestUpdatedAt`

Used by the task creation form's series dropdown and the Kanban board's initial data fetch.

```sql
SELECT series_id, 
       COUNT(*) as total_parts,
       json_object_agg(current_status, cnt) as status_counts,
       MAX(updated_at) as latest_updated_at
FROM tasks
WHERE series_id IS NOT NULL
GROUP BY series_id
ORDER BY latest_updated_at DESC;
```

### 16. GET `/api/series/[id]` — Single series detail

**File:** `src/app/api/series/[id]/route.ts` (new)

Returns all tasks in a series, ordered by `partNumber`:
```json
{
  "seriesId": "wedding_sharma_2025",
  "parts": [
    { "id": "SHANUZZ-0041", "partNumber": 1, "status": "Task Completed", ... },
    { "id": "SHANUZZ-0042", "partNumber": 2, "status": "Video Edited", ... }
  ]
}
```

---

## Implementation Order (Phased)

### Phase A: Database + API (Backend Foundation)
| Step | Description | Files |
|------|-------------|-------|
| A1 | Add `seriesId`, `partNumber` to Prisma schema | `prisma/schema.prisma` |
| A2 | Run migration | CLI |
| A3 | Update GET `/api/tasks` to include series siblings | `src/app/api/tasks/route.ts` |
| A4 | Update POST `/api/tasks` to accept series fields | `src/app/api/tasks/route.ts` |
| A5 | Update PUT `/api/tasks/[id]` to allow series field edits | `src/app/api/tasks/[id]/route.ts` |
| A6 | Create GET `/api/series` endpoint | `src/app/api/series/route.ts` (new) |
| A7 | Create GET `/api/series/[id]` endpoint | `src/app/api/series/[id]/route.ts` (new) |

### Phase B: Task Creation / Editing
| Step | Description | Files |
|------|-------------|-------|
| B1 | Update `TaskForm` component with series fields | `src/components/task-form.tsx` |
| B2 | Update new task page to pass series data | `src/app/tasks/new/page.tsx` |
| B3 | Update edit task page with series edit capability | `src/app/tasks/[id]/edit/page.tsx` |

### Phase C: Kanban Board (Core UX)
| Step | Description | Files |
|------|-------------|-------|
| C1 | Implement series grouping logic | `src/app/kanban/page.tsx` |
| C2 | Build SeriesCard component (collapsible, multi-part) | `src/components/series-card.tsx` (new) |
| C3 | Update column placement logic for series cards | `src/app/kanban/page.tsx` |
| C4 | Handle optimistic updates with series-aware re-grouping | `src/app/kanban/page.tsx` |

### Phase D: Dashboard + Task Detail
| Step | Description | Files |
|------|-------------|-------|
| D1 | Add series indicator to `TaskCard` | `src/components/task-card.tsx` |
| D2 | Add series context widget to task detail | `src/app/tasks/[id]/page.tsx` |
| D3 | Add series filter toggle to dashboard | `src/app/page.tsx` |

---

## Edge Cases & Guardrails

- **Deleting a part:** Remove the task. If only 1 part remains, `seriesId` should be cleared on the remaining task (or left as-is for consistency — the UI handles single-part series gracefully)
- **Renumbering:** Admin can change `partNumber` via edit form. Validate uniqueness within series (same `partNumber` for two tasks in same series = server-side validation error)
- **Merging series:** Admin moves a task from Series A to Series B → just change `seriesId`
- **Empty series:** If all tasks in a series are deleted, the series ceases to exist (no orphan series table)
- **Kanban performance:** The series grouping re-computes on every `moveTask()` call. With <500 tasks this is negligible. If performance ever becomes an issue, memoize the grouping with `useMemo` keyed on task IDs + statuses
- **Bulk advance with series:** The existing bulk-advance button on dashboard advances each selected task independently — works correctly with series without changes

---

## Testing Checklist

- [ ] Create two tasks in same series → both appear as one grouped card in Kanban
- [ ] Move Part 1 to different status → series card re-positions correctly in Kanban
- [ ] Move Part 2 independently → Part 1 stays in original column
- [ ] Task detail shows sibling parts with clickable links
- [ ] Dashboard shows "Part X of Y" on series tasks
- [ ] Create task form: select existing series → part number auto-suggests
- [ ] Edit task: admin changes series assignment → activity log records it
- [ ] Filter dashboard by series → only series-grouped tasks show
- [ ] Delete a part → remaining parts still show series context
- [ ] Single-part series → no duplicate grouping, shown as normal task card

---

*Plan prepared based on codebase exploration of commit `main` branch. Schema at `prisma/schema.prisma`, Kanban at `src/app/kanban/page.tsx`, Task detail at `src/app/tasks/[id]/page.tsx`.*
