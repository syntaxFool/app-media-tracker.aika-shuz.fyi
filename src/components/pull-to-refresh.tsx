"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  /** Disable PTR when scrolled horizontally (for kanban) — defaults to false */
  disabled?: boolean;
}

const THRESHOLD = 64; // px to pull before triggering refresh
const MAX_PULL = 112; // max pull distance

export default function PullToRefresh({ onRefresh, children, disabled }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const scrollTopAtStart = useRef(0);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || refreshing) return;
      const el = containerRef.current;
      if (!el) return;
      // Only trigger when the container is scrolled to the very top
      if (el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      scrollTopAtStart.current = el.scrollTop;
      pulling.current = true;
    },
    [disabled, refreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current || disabled || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      // Only allow pull when at top
      if (scrollTopAtStart.current > 0) return;
      // Clamp the pull distance
      const clamped = Math.min(delta * 0.5, MAX_PULL);
      setPullDistance(clamped);
    },
    [disabled, refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    pulling.current = false;
    if (disabled || refreshing) {
      setPullDistance(0);
      return;
    }
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh, disabled, refreshing]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto" style={{ overscrollBehaviorY: "contain" }}>
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center transition-all duration-200 ease-out overflow-hidden"
        style={{ height: pullDistance, opacity: Math.min(pullDistance / THRESHOLD, 1) }}
      >
        <Loader2
          className={`w-5 h-5 text-fg-quaternary transition-transform duration-300 ${
            refreshing ? "animate-spin" : ""
          }`}
          style={{ transform: refreshing ? undefined : `rotate(${Math.min(pullDistance / THRESHOLD, 1) * 360}deg)` }}
        />
      </div>

      {/* Refreshing indicator — shown above content while loading */}
      {refreshing && (
        <div className="flex items-center justify-center py-3 animate-fade-in">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      )}

      {children}
    </div>
  );
}
