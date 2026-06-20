# ImagePreview Lightbox Simplification

**Goal:** Simplify the ImagePreview lightbox: remove zoom controls, use React portal, enforce 48px close button, clean backdrop handling.

**Architecture:** Single component change — `src/components/image-preview.tsx`. The peek (long-press) and hover (desktop) behaviors remain untouched. Only the lightbox modal gets simplified.

**Decisions:**
- ✅ Keep long-press peek + desktop hover as-is
- ✅ Keep download button in lightbox (requested earlier)
- ❌ Remove zoom controls (+, -, 100%)
- ✅ React portal for fixed root-level DOM placement
- ✅ 48×48px close button, backdrop dismiss
- ✅ `rgba(0,0,0,0.85)` backdrop, `z-index: 9999`

---

## Task 1: Simplify Lightbox + Add Portal

**Files:**
- Modify: `src/components/image-preview.tsx`

### Changes:

1. **Import `createPortal`** from `react-dom`

2. **Replace the lightbox JSX** — remove zoom controls, add portal wrapper, use 48px close button:

```tsx
import { createPortal } from "react-dom";

// Remove: zoom state (line), zoom controls JSX block
// Keep: lightbox state, lightbox setter

// Inside the return, replace the entire {lightbox && ...} block with this:

{lightbox && createPortal(
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in"
    style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
    onClick={() => { setLightbox(false); }}
  >
    {/* Close button — min 48x48 */}
    <button
      onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
      className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
      title="Close"
    >
      <X className="w-5 h-5" />
    </button>

    {/* Download button — top-left */}
    <button
      onClick={(e) => { e.stopPropagation(); handleDownload(e); }}
      className="absolute top-4 left-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
      title="Download"
    >
      <Download className="w-5 h-5" />
    </button>

    {/* Image */}
    <img
      src={src}
      alt={alt}
      className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
      onClick={e => e.stopPropagation()}
    />
  </div>,
  document.body
)}
```

3. **Remove unused imports**: `ZoomIn`, `ZoomOut` (from lucide-react import line)

4. **Remove unused state/vars**: `zoom` state variable and all `setZoom` calls

### Resulting state variables retained:
- `peeking`, `peekStyle` — peek/hover preview
- `lightbox` — controls lightbox visibility
- `peekTimer`, `triggerRef`, `longPressRef` — interaction tracking

### Verification:
```bash
npx next build
```
Expected: compiles cleanly, no errors.

### Commit:
```bash
git commit -am "feat: simplify lightbox — portal, no zoom, 48px close button"
```

---

## Task 2: Deploy

```bash
rsync -avz -e "ssh -p 2222" src/components/image-preview.tsx nas@154.84.215.26:/home/nas/media-tracker/src/components/image-preview.tsx
ssh -p 2222 nas@154.84.215.26 "cd /home/nas/media-tracker && docker compose up -d --build web" | tail -3
```

Verify app loads and lightbox opens/closes correctly.
