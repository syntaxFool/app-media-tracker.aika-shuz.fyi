# Use Case Plan: UC-002 — Database Spreadsheet View (Sheet Page)

**Status:** Completed  
**Date:** 2026-07-01  
**Use Case:** Full spreadsheet-style database interface with universal search & filtering  

---

## Overview

Provide a dense, tabular grid ("Sheet style") view of all tasks in the media tracker system. Unlike the standard Dashboard, which focuses on active operations, the Sheet view presents all entries (both active and historic) to facilitate bulk auditing, tabular search, and easy exports.

### Current State (Gap Analysis)

| Feature | Dashboard | History | Spreadsheet View (New) |
|---|---|---|---|
| **Layout** | Kanban/Card-based | Card-based list | Dense interactive table (Grid) |
| **Task Scope** | Active tasks (<24h completed) | Historic tasks (>24h completed) | **All recorded tasks** |
| **Search Scope** | ID/Name/Notes (API) | ID/Name (API) | **All fields (Client-side fast search)** |
| **Exporting** | Active filtered subset | None | **Fully filtered spreadsheet subset** |
| **Column Sorting**| Created At, Name, Status | None | **Interactive header-sorting on all columns** |

---

## Design Decisions

1. **Routing:** Registered under `/sheet` path.
2. **API Endpoint Extension:** Extended `GET /api/tasks` to support `status=all` parameter to pull all records (historic + active) in a single request.
3. **Client-Side High-Speed Filtering:** Performs real-time substring searches client-side across task properties:
   - Task ID
   - Customer Name
   - Shoot Date (formatted)
   - Due Date (formatted)
   - Note contents
   - Service category
   - Status value
   - Assigned staff names
4. **Header Interactive Sorting:** Standard sorting indicator icons (arrow sets) toggle fields ascending/descending.
5. **CSV Export:** Downloads currently filtered set dynamically.

---

## Technical Details & Code Elements

### 1. API Route Modifications
**File:** [tasks/route.ts](file:///Drive/codeProject/Shanuzz/saLab-server/app-media-tracker.aika-shuz.fyi/src/app/api/tasks/route.ts)
* Added support for `status=all` parameter:
```typescript
if (status === "all") {
  // Fetch all tasks without status restrictions
} else if (!status) {
  // Fetch active tasks only
}
```

### 2. Page Implementation
**File:** [sheet/page.tsx](file:///Drive/codeProject/Shanuzz/saLab-server/app-media-tracker.aika-shuz.fyi/src/app/sheet/page.tsx)
* Integrates `AppLayout` and uses the standard `SearchBar` component.
* Implements robust state machinery for filters, query matching, column sorting, and statistics compilation.

### 3. Layout Navigation Update
**File:** [components/layout.tsx](file:///Drive/codeProject/Shanuzz/saLab-server/app-media-tracker.aika-shuz.fyi/src/components/layout.tsx)
* Registered the new `/sheet` route tab into the main desktop sidebar and mobile bottom navigation lists using the `Table` icon from `lucide-react`.

---

## User Acceptance Criteria
- [x] Accessible via navigation bar labeled "Sheet".
- [x] Renders all tasks in a grid database representation.
- [x] Instant typing search matches text on customer name, task ID, date formats, status, notes, and staff assignees.
- [x] Filtering works using drop-downs for Status, Service, Gender, and Influencer categories.
- [x] Supports sorting toggle (ascending vs. descending) on clicking column headers.
- [x] Export to CSV button generates file of current grid results.
- [x] Clicking any row redirects to details page (`/tasks/[id]`).
- [x] Dark mode colors match the app theme dynamically.
