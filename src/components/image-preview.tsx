"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";

interface ImagePreviewProps {
  src: string;
  alt?: string;
  children: React.ReactNode;
}

export default function ImagePreview({ src, alt = "", children }: ImagePreviewProps) {
  const [peeking, setPeeking] = useState(false);
  const [peekStyle, setPeekStyle] = useState<React.CSSProperties>({});
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef(false);

  const [lightbox, setLightbox] = useState(false);

  // Long-press detection (mobile)
  function handleTouchStart(e: React.TouchEvent) {
    longPressRef.current = false;
    const touch = e.touches[0];
    peekTimer.current = setTimeout(() => {
      longPressRef.current = true;
      setPeekStyle({
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 60,
        maxWidth: "min(80vw, 400px)",
        maxHeight: "min(80vh, 400px)",
      });
      setPeeking(true);
    }, 300);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    if (longPressRef.current) {
      e.preventDefault();
      longPressRef.current = false;
    }
    setPeeking(false);
  }

  function handleTouchMove() {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    if (longPressRef.current) {
      longPressRef.current = false;
      setPeeking(false);
    }
  }

  // Hover preview (desktop only)
  function handleMouseEnter(e: React.MouseEvent) {
    if ("ontouchstart" in window) return;
    peekTimer.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceRight = window.innerWidth - rect.left;
        const previewW = Math.min(280, window.innerWidth * 0.8);
        const previewH = Math.min(280, window.innerHeight * 0.8);
        let top: number, left: number;
        if (spaceBelow >= previewH + 8) {
          top = rect.bottom + 8;
          left = Math.min(rect.left, window.innerWidth - previewW - 8);
        } else if (rect.top >= previewH + 8) {
          top = rect.top - previewH - 8;
          left = Math.min(rect.left, window.innerWidth - previewW - 8);
        } else {
          top = rect.bottom + 8;
          left = Math.max(8, Math.min(rect.left, window.innerWidth - previewW - 8));
        }
        setPeekStyle({
          position: "fixed" as const,
          top,
          left,
          zIndex: 60,
          maxWidth: previewW,
          maxHeight: previewH,
        });
      }
      setPeeking(true);
    }, 350);
  }

  function handleMouseLeave() {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    setPeeking(false);
  }

  // Click → Lightbox (only if it was a quick tap, not long-press end)
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (longPressRef.current) { longPressRef.current = false; return; }
    setLightbox(true);
  }

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setLightbox(false); }
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

  const isMobile = typeof window !== "undefined" && "ontouchstart" in window;

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

      {/* Peek preview — mobile long-press (centered with dim) or desktop hover (tooltip near icon) */}
      {peeking && (isMobile ? (
        // Mobile: centered modal
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center animate-fade-in" onTouchStart={() => setPeeking(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-elev-dialog overflow-hidden"
            style={{ maxWidth: "min(80vw, 400px)", maxHeight: "min(80vh, 400px)" }}
            onClick={e => e.stopPropagation()}
          >
            <img src={src} alt={alt} className="w-full h-full object-contain" style={{ maxHeight: "min(80vh, 400px)" }} />
          </div>
        </div>
      ) : (
        // Desktop: tooltip near icon
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 rounded-lg shadow-elev-dialog overflow-hidden animate-fade-in"
          style={peekStyle}
          onMouseEnter={() => { if (peekTimer.current) clearTimeout(peekTimer.current); }}
        >
          <img src={src} alt={alt} className="w-full h-full object-contain" style={{ maxHeight: "min(80vh, 300px)", maxWidth: "min(80vw, 300px)" }} />
        </div>
      ))}

      {/* Lightbox */}
      {lightbox && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
          onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
        >
          {/* Close button — 48x48 */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
            className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Download button */}
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
    </>
  );
}
