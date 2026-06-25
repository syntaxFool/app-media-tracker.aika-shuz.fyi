# Task Detail Page UI/UX Audit Fixes

## Fixes to apply

### 1. Due Date banner contrast
- File: `src/app/tasks/[id]/page.tsx`
- The "Due: Tue, 30 Jun" text uses `text-danger` / `text-warning` which is dark on dark bg
- Add explicit light colors for dark mode: `dark:text-red-300` / `dark:text-amber-300`

### 2. Consolidate overflow menus
- File: `src/app/tasks/[id]/page.tsx`
- Two 3-dot menus: one in the global app bar (layout.tsx), one in the task header
- Currently the task header has Edit button + MoreVertical (with Delete)
- The global app bar already has a user menu
- Move the Delete action into the existing Edit button as a secondary action, or remove the dedicated MoreVertical and add a delete option on long-press / secondary in the edit page

### 3. Remove duplicate Influencer row
- File: `src/app/tasks/[id]/page.tsx`
- The star in the header already indicates influencer status
- Remove the "Influencer: ⭐ Yes" DetailRow from the details card

### 4. Standardize input buttons
- File: `src/app/tasks/[id]/page.tsx`
- Shot List "+" button: `btn-primary text-label px-3 py-1.5` (square-ish)
- Comments "Send" button: `btn-primary text-label px-3 rounded-sm self-start` (wider)
- Standardize both to same class: `btn-primary text-label px-3 py-1.5 rounded-sm`

### 5. FAB occlusion
- File: `src/app/tasks/[id]/page.tsx`
- Add `pb-32` to the main container div to clear the bottom FAB
- Currently has `space-y-5` but no bottom padding

### 6. EXIF rotation
- File: `src/app/api/upload/route.ts`
- Add `sharp` to auto-rotate images based on EXIF orientation metadata
- Install: `npm install sharp`
- Import and process: `sharp(buffer).rotate().jpeg({ quality: 85 }).toBuffer()`
