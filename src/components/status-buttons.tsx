"use client";

import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";

interface StatusButtonsProps {
  currentStatus: string;
  nextStatuses: string[];
  onUpdate: (newStatus: string) => Promise<void>;
  disabled?: boolean;
}

export default function StatusButtons({
  currentStatus,
  nextStatuses,
  onUpdate,
  disabled,
}: StatusButtonsProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  async function handleClick(status: string) {
    setUpdating(status);
    try { await onUpdate(status); } finally { setUpdating(null); }
  }

  if (nextStatuses.length === 0) {
    return (
      <div className="text-success text-caption bg-success/5 border border-success/10 rounded-sm px-3 py-3 text-center">
        ✅ Task Completed
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-label text-fg-tertiary">Update Status</p>
      <div className="space-y-1.5">
        {nextStatuses.map((status) => (
          <button
            key={status}
            onClick={() => handleClick(status)}
            disabled={disabled || updating !== null}
            className="w-full flex items-center justify-between bg-surface border border-border rounded-sm px-4 py-3 hover:bg-white transition-all disabled:opacity-50"
          >
            <span className="text-sm text-fg-primary font-[510]">Move to {status}</span>
            {updating === status ? (
              <Loader2 className="w-4 h-4 text-fg-tertiary animate-spin" />
            ) : (
              <ChevronRight className="w-4 h-4 text-fg-quaternary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
