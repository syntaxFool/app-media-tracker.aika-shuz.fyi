# Image Preview on Task Cards — Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill or subagent-driven-development to implement.

**Goal:** Add photo thumbnail icons to dashboard and kanban task cards, with long-press peek preview (mobile), hover preview (desktop), and click-to-lightbox (both).

**Architecture:** A new `ImagePreview` component handles three interaction modes: touch long-press (centered peek), mouse hover (tooltip near icon), and click (persistent lightbox with zoom + download). `TaskCard` and kanban inline cards get a `photoPath` prop and render a 24×24 thumbnail when present.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, lucide-react

**Decisions:**
- Quick tap on icon → Open persistent lightbox (with zoom + download)
- Desktop click → Same lightbox with download button
- Desktop hover → Tooltip-style preview near cursor/icon (350ms delay)
- Mobile long-press → Centered peek preview (dismiss on finger lift)
- No delete from preview — deletion stays in edit form

---

## Task 1: Add `photoPath` to TaskCard + render thumbnail icon

**Files:**
- Modify: `src/components/task-card.tsx`

**Step 1: Add `photoPath` to the Task interface**

```typescript
interface Task {
  id: string; customerName: string; shootDate: string; dueDate: string | null;
  service: string; gender: string; isInfluencer: boolean; status: string;
  createdBy: string; assignedTo?: string[]; photoPath?: string | null;
}
```

**Step 2: Render a 24×24 thumbnail in the bottom row**

Replace the bottom row structure from:

```tsx
<div className="flex items-center justify-between">
  <span className="text-micro font-mono font-[510] text-fg-tertiary dark:text-gray-400">{task.id}</span>
  <StatusBadge status={task.status} />
</div>
```

To:

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <span className="text-micro font-mono font-[510] text-fg-tertiary dark:text-gray-400">{task.id}</span>
    {task.photoPath && (
      <div className="w-6 h-6 rounded-sm overflow-hidden border border-border dark:border-gray-700 flex-shrink-0 cursor-pointer">
        <img src={task.photoPath} alt="" className="w-full h-full object-cover" />
      </div>
    )}
  </div>
  <StatusBadge status={task.status} />
</div>
```

Later (in Task 3), the `<img>` tag will be replaced with an `ImagePreview` component trigger. For now, this establishes the layout and passes photo data.

**Step 3: Verify build**

```bash
npx next build
```

**Step 4: Commit**

```bash
git add src/components/task-card.tsx
git commit -m "feat: add photoPath to TaskCard interface and render thumbnail in bottom row"
```

---

## Task 2: Add photo thumbnail to Kanban cards

**Files:**
- Modify: `src/app/kanban/page.tsx`

**Step 1: Add thumbnail to the meta row**

In the kanban inline card template (around line 113), the meta row currently shows task ID + service. Insert a thumbnail before the task ID when `photoPath` exists:

```tsx
{/* Meta row */}
<div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
  {task.photoPath && (
    <div className="w-5 h-5 rounded-sm overflow-hidden border border-border dark:border-gray-700 flex-shrink-0">
      <img src={task.photoPath} alt="" className="w-full h-full object-cover" />
    </div>
  )}
  <span className="text-tiny text-fg-quaternary dark:text-gray-500 font-mono">{task.id}</span>
  <span className="text-tiny text-fg-quaternary dark:text-gray-500">{task.service}</span>
</div>
```

The kanban `fetchTasks` already fetches full task objects which include `photoPath`. The `<img>` will be replaced with `ImagePreview` in Task 3.

**Step 2: Verify build**

```bash
npx next build
```

**Step 3: Commit**

```bash
git add src/app/kanban/page.tsx
git commit -m "feat: add photo thumbnail to kanban cards"
```

---

## Task 3: Create ImagePreview component

**Files:**
- Create: `src/components/image-preview.tsx`
- Modify: `src/app/globals.css` (add animation keyframes)

**Step 1: Create the full component**

```typescript
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Download, X, ZoomIn, ZoomOut } from "lucide-react";

interface ImagePreviewProps {
  src: string;
  alt?: string;
  /** Custom trigger element — wraps children */
  children: React.ReactNode;
}

export default function ImagePreview({ src, alt = "", children }: ImagePreviewProps) {
  // --- Peek (long-press / hover) ---
  const [peeking, setPeeking] = useState(false);
  const [peekStyle, setPeekStyle] = useState<React.CSSProperties>({});
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef(false);

  // --- Lightbox (click) ---
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Long-press detection (mobile)
  function handleTouchStart(e: React.TouchEvent) {
    longPressRef.current = false;
    peekTimer.current = setTimeout(() => {
      longPressRef.current = true;
      setPeeking(true);
    }, 300);
  }

  function handleTouchEnd() {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    setPeeking(false);
  }

  function handleTouchMove() {
    // Cancel long-press if finger moves
    if (peekTimer.current) clearTimeout(peekTimer.current);
    setPeeking(false);
  }

  // Hover preview (desktop)
  function handleMouseEnter(e: React.MouseEvent) {
    if ("ontouchstart" in window) return; // skip on touch devices
    peekTimer.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        // Position tooltip near the icon, flipping to avoid edge clipping
        const top = rect.bottom + 8;
        const left = Math.min(rect.left, window.innerWidth - 300);
        setPeekStyle({ position: "fixed", top, left, zIndex: 60 });
      }
      setPeeking(true);
    }, 350);
  }

  function handleMouseLeave() {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    setPeeking(false);
  }

  // Click → Lightbox
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation(); // don't navigate to task detail
    e.preventDefault();
    if (longPressRef.current) {
      longPressRef.current = false;
      return; // long-press just happened, don't open lightbox
    }
    setLightbox(true);
  }

  // Keyboard: Escape to close lightbox
  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setLightbox(false); setZoom(1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = src;
    a.download = alt || "photo";
    a.click();
  }

  return (
    <>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="cursor-pointer inline-flex"
      >
        {children}
      </div>

      {/* Peek overlay (mobile: centered, desktop: tooltip) */}
      {peeking && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center sm:block sm:bg-transparent sm:inset-auto animate-fade-in"
          onClick={() => setPeeking(false)}
          style={peekStyle}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-elev-dialog overflow-hidden"
            style={{ maxWidth: "min(80vw, 400px)", maxHeight: "min(80vh, 400px)" }}
            onClick={e => e.stopPropagation()}
          >
            <img src={src} alt={alt} className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      {/* Persistent Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fade-in" onClick={() => { setLightbox(false); setZoom(1); }}>
          {/* Close + Download bar */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button onClick={handleDownload} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" title="Download">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={() => { setLightbox(false); setZoom(1); }} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" title="Zoom out">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={() => setZoom(1)} className="px-3 py-2 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors" title="Reset zoom">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.5))} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" title="Zoom in">
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* Image */}
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
            style={{ transform: `scale(${zoom})`, cursor: zoom > 1 ? "grab" : "default" }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
```

**Step 2: Wrap thumbnail in ImagePreview inside TaskCard**

In `task-card.tsx`, replace the thumbnail `<img>` with:

```tsx
{task.photoPath && (
  <ImagePreview src={task.photoPath} alt={task.customerName}>
    <div className="w-6 h-6 rounded-sm overflow-hidden border border-border dark:border-gray-700 flex-shrink-0">
      <img src={task.photoPath} alt="" className="w-full h-full object-cover" />
    </div>
  </ImagePreview>
)}
```

Import `ImagePreview` at the top.

**Step 3: Wrap thumbnail in ImagePreview inside Kanban cards**

Same pattern as TaskCard — wrap the kanban thumbnail in `<ImagePreview>`.

**Step 4: Verify build**

```bash
npx next build
```

**Step 5: Commit**

```bash
git add src/components/image-preview.tsx src/components/task-card.tsx src/app/kanban/page.tsx src/app/globals.css
git commit -m "feat: add ImagePreview component with peek, hover, and lightbox"
```

---

## Task 4: Deploy to Server

**Step 1: Sync all changed files**

```bash
rsync -avz -e "ssh -p 2222" src/components/image-preview.tsx nas@154.84.215.26:/home/nas/media-tracker/src/components/image-preview.tsx
rsync -avz -e "ssh -p 2222" src/components/task-card.tsx nas@154.84.215.26:/home/nas/media-tracker/src/components/task-card.tsx
rsync -avz -e "ssh -p 2222" src/app/kanban/page.tsx nas@154.84.215.26:/home/nas/media-tracker/src/app/kanban/page.tsx
```

**Step 2: Rebuild Docker**

```bash
ssh -p 2222 nas@154.84.215.26 "cd /home/nas/media-tracker && docker compose up -d --build web"
```

**Step 3: Verify**

- Test on mobile: long-press thumbnail → peek overlay in center → lift finger to dismiss
- Test on desktop: hover thumbnail → tooltip preview near icon → move cursor away to dismiss
- Test on both: click thumbnail → persistent lightbox with zoom + download

**Step 4: Commit deploy state**

```bash
git add -A && git commit -m "deploy: image preview on task cards" && git push
```

---

## File Change Summary

| File | Action |
|---|---|
| `src/components/image-preview.tsx` | **New** — ImagePreview component |
| `src/components/task-card.tsx` | Add `photoPath` to interface, render `ImagePreview` thumbnail in bottom row |
| `src/app/kanban/page.tsx` | Add `ImagePreview` thumbnail to meta row |
| `src/app/globals.css` | No changes needed (uses existing `animate-fade-in`, `shadow-elev-dialog`) |
