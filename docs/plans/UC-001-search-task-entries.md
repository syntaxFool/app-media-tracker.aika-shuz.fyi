# Implementation Plan: UC-001 — Search for a Task Entry

**Status:** Draft  
**Date:** 2026-07-01  
**Use Case:** Search and Filter Task Entries across Dashboard, Kanban, and History views

---

## Overview

Add unified text search across all task views (Dashboard, Kanban, History) with debounced input, extended backend search fields, and consistent empty states. The existing `SearchBar` component and API search parameter already exist — this plan extends them to cover the full use case.

### Current State (Gap Analysis)

| Feature | Dashboard | Kanban | History |
|---|---|---|---|
| Text search | ❌ Missing | ❌ Missing | ✅ Exists (name + ID) |
| Influencer filter | ✅ In filter panel | ❌ Missing | N/A |
| Service filter | ✅ In filter panel | ❌ Missing | N/A |
| Gender filter | ✅ In filter panel | ❌ Missing | N/A |
| Debouncing | ❌ None | ❌ None | ❌ None |
| Search empty state | ❌ Generic only | ❌ Generic only | ✅ Partial |

### What Already Works

- **`SearchBar` component** (`src/components/search-bar.tsx`): Controlled input with search icon + clear button. Only used on History page today.
- **API search param** (`GET /api/tasks?search=`): Case-insensitive `contains` on `id` and `customerName`. Missing: `note`, `seriesId`.
- **Dashboard filter architecture**: API-side filters (influencer, service, gender) + client-side filters (status, sort, active/all, series-only).

### Design Decisions

1. **API-side search** (not client-side): Consistent with existing influencer/service/gender filter pattern. Client-side status/sort/series-only filtering continues on top of API results.
2. **No new dependencies**: Use existing `fetch()` + `useCallback`/`useEffect` pattern. Add a small `useDebounce` hook.
3. **No React Query refactor**: Out of scope for this plan; the app's simple fetch pattern works fine.
4. **Search placement**: Add `SearchBar` to each page individually (not in shared layout) for page-specific UX.

---

## Task Breakdown

### Phase 1: Backend — Extend API Search Fields

**File:** `src/app/api/tasks/route.ts`

**What:** Add `note` and `seriesId` to the Prisma search filter so users can search by note text or series ID.

**Changes:**
- In the `search` filter block (~line 48-58), extend the `OR` array:
  ```ts
  { note: { contains: search, mode: "insensitive" } },
  { seriesId: { contains: search, mode: "insensitive" } },
  ```

**Acceptance criteria:**
- [ ] Searching by text found in a task's `note` field returns matching tasks
- [ ] Searching by a `seriesId` value (e.g., "SERIES-001") returns tasks in that series
- [ ] Existing search on `id` and `customerName` continues to work
- [ ] Case-insensitive matching works for all new fields

**Estimated effort:** ~5 lines changed

---

### Phase 2: Shared — Create `useDebounce` Hook

**File:** `src/hooks/use-debounce.ts` (new)

**What:** A reusable debounce hook to prevent excessive API calls while typing.

**Implementation:**
```ts
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delayMs: number = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
```

**Acceptance criteria:**
- [ ] Hook delays value updates by the specified delay (default 400ms)
- [ ] Cleans up timeout on unmount or value change
- [ ] Type-safe with generics

**Estimated effort:** ~15 lines, new file

---

### Phase 3: Dashboard — Add Text Search

**File:** `src/app/page.tsx`

**What:** Add a `SearchBar` to the Dashboard, wired with debouncing to the API.

**Changes:**

1. **Import** `SearchBar` and `useDebounce`:
   ```ts
   import SearchBar from "@/components/search-bar";
   import { useDebounce } from "@/hooks/use-debounce";
   ```

2. **Add state**: `const [searchInput, setSearchInput] = useState("");`

3. **Debounce**: `const debouncedSearch = useDebounce(searchInput, 400);`

4. **Wire to API**: Add `debouncedSearch` to `fetchTasks` dependency array and API params:
   ```ts
   if (debouncedSearch) params.set("search", debouncedSearch);
   ```

5. **Render SearchBar**: Insert between the status pipeline and the action bar:
   ```tsx
   <SearchBar
     value={searchInput}
     onChange={setSearchInput}
     placeholder="Search by name, note, series, or Task ID..."
   />
   ```

6. **Update empty state**: When `searchInput` is non-empty and no results, show a search-specific empty state:
   ```tsx
   {searchInput ? (
     <>
       <p className="empty-state-title">No tasks matching "{searchInput}"</p>
       <p className="empty-state-desc">Try a different search term or clear the search</p>
     </>
   ) : (
     // existing empty state
   )}
   ```

**Acceptance criteria:**
- [ ] SearchBar visible on Dashboard between status pipeline and action bar
- [ ] Typing triggers debounced API fetch (400ms delay)
- [ ] Results update to show only matching tasks
- [ ] Status/sort/other client-side filters still work on top of search results
- [ ] Clear button (X) resets search and shows all tasks
- [ ] Empty state shows search term when no results found
- [ ] Search doesn't break existing status pipeline multi-select

**Estimated effort:** ~30 lines changed in `page.tsx`

---

### Phase 4: Kanban — Add Text Search + Filters

**File:** `src/app/kanban/page.tsx`

**What:** Add `SearchBar` and filter controls (influencer, service, gender) to the Kanban view, matching Dashboard parity.

**Changes:**

1. **Import** `SearchBar` and `useDebounce`:
   ```ts
   import SearchBar from "@/components/search-bar";
   import { useDebounce } from "@/hooks/use-debounce";
   ```

2. **Add state**:
   ```ts
   const [searchInput, setSearchInput] = useState("");
   const [influencerFilter, setInfluencerFilter] = useState("");
   const [serviceFilter, setServiceFilter] = useState("");
   const [genderFilter, setGenderFilter] = useState("");
   ```

3. **Debounce search**: `const debouncedSearch = useDebounce(searchInput, 400);`

4. **Wire to API**: Update `fetchTasks` to include all filter params:
   ```ts
   const params = new URLSearchParams();
   if (debouncedSearch) params.set("search", debouncedSearch);
   if (influencerFilter) params.set("influencer", influencerFilter);
   if (serviceFilter) params.set("service", serviceFilter);
   if (genderFilter) params.set("gender", genderFilter);
   const res = await fetch(`/api/tasks?${params}`);
   ```
   Add all four deps to `useCallback` dependency array.

5. **Render SearchBar + filters**: Add a compact filter row in the Kanban header area (below the title):
   ```tsx
   <div className="space-y-2 mb-3">
     <SearchBar value={searchInput} onChange={setSearchInput}
       placeholder="Search tasks..." />
     <div className="flex items-center gap-2 overflow-x-auto">
       {/* Influencer toggle */}
       {/* Service dropdown (populated from tasks) */}
       {/* Gender dropdown (populated from config) */}
     </div>
   </div>
   ```

6. **Update empty state**: Show search-specific message when filtering yields no results.

**Acceptance criteria:**
- [ ] SearchBar visible on Kanban page
- [ ] Typing triggers debounced API fetch
- [ ] Influencer/service/gender filters work on Kanban
- [ ] Filters + search can be combined
- [ ] Board columns correctly reflect filtered results
- [ ] Series grouping logic still works with filtered data
- [ ] Empty columns show appropriate message

**Estimated effort:** ~40 lines changed in `kanban/page.tsx`

---

### Phase 5: History — Add Debouncing

**File:** `src/app/history/page.tsx`

**What:** Add debouncing to the existing search to prevent excessive API calls.

**Changes:**

1. **Import** `useDebounce`
2. **Debounce search**: `const debouncedSearch = useDebounce(search, 400);`
3. **Use debounced value** in `fetchHistory` instead of raw `search`

**Acceptance criteria:**
- [ ] Search on History page is debounced (400ms)
- [ ] Existing search behavior unchanged otherwise

**Estimated effort:** ~5 lines changed

---

### Phase 6: Network Error Handling

**Files:** `src/app/page.tsx`, `src/app/kanban/page.tsx`, `src/app/history/page.tsx`

**What:** Add error state display when API calls fail during search.

**Changes:**
- Add `const [error, setError] = useState<string | null>(null);` to each page
- In `fetchTasks`/`fetchHistory` catch blocks:
  - Set error message when not an AbortError
  - Clear error on successful fetch
- Display inline error banner above the task list when `error` is set:
  ```tsx
  {error && (
    <div className="bg-danger/10 text-danger border border-danger/20 rounded-md px-3 py-2 text-sm">
      {error}
    </div>
  )}
  ```

**Acceptance criteria:**
- [ ] Network failures show inline error message on each page
- [ ] Error clears on next successful fetch
- [ ] AbortErrors (from debounce cancellation) don't trigger error state

**Estimated effort:** ~20 lines total across 3 files

---

### Phase 7: Polish — Empty State Consistency

**Files:** `src/app/page.tsx`, `src/app/kanban/page.tsx`

**What:** Ensure empty states clearly distinguish between:
1. No tasks exist at all
2. No tasks match the current search term
3. No tasks match the current filter combination

**Changes:**
- Dashboard: Already partially done in Phase 3. Extend to also mention active filters.
- Kanban: Add conditional empty state messaging per column and at the board level.

**Acceptance criteria:**
- [ ] Empty state shows the search term when applicable
- [ ] Empty state suggests clearing filters/search
- [ ] Board-level empty state vs column-level empty state are distinct

**Estimated effort:** ~15 lines changed across 2 files

---

## Execution Order

```
Phase 1 (API search fields)  ──┐
                                ├── Can be parallelized
Phase 2 (useDebounce hook)   ──┘
          │
Phase 3 (Dashboard search)   ──┐
Phase 4 (Kanban search)      ──┤── Can be parallelized
Phase 5 (History debounce)   ──┘
          │
Phase 6 (Error handling)     ──┐── Can be parallelized
Phase 7 (Empty state polish) ──┘
```

---

## Files Changed Summary

| File | Action | Lines |
|---|---|---|
| `src/hooks/use-debounce.ts` | **New** | ~15 |
| `src/app/api/tasks/route.ts` | Edit | +2 |
| `src/app/page.tsx` | Edit | +30 |
| `src/app/kanban/page.tsx` | Edit | +40 |
| `src/app/history/page.tsx` | Edit | +5 |

**Total:** ~92 lines across 5 files (1 new, 4 modified)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Adding search to Kanban filter row could feel cramped on mobile | Use `overflow-x-auto` with horizontal scroll, same as Dashboard action bar |
| Debounced search could cause flicker if API response is slow | Keep previous results visible until new results arrive (already the case with useState) |
| Series grouping on Kanban could break with filtered data | Test with search terms that match only some parts of a series |
| `note` field can be large text — contains search may be slow at scale | Add database index on `note` if performance becomes an issue (monitor first) |

---

## Out of Scope (Future Work)

- Search in the app header/navigation bar (global search)
- Full-text search with PostgreSQL `tsvector` for better relevance ranking
- Search history / recent searches
- Advanced search with field-specific operators (e.g., `status:New customer:John`)
- React Query / TanStack Query migration for better caching and stale-while-revalidate
