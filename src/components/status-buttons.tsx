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
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  async function handleConfirm() {
    if (!confirmStatus) return;
    setUpdating(confirmStatus);
    try { await onUpdate(confirmStatus); } finally {
      setUpdating(null);
      setConfirmStatus(null);
    }
  }

  if (nextStatuses.length === 0) {
    return (
      <div className="text-success text-label bg-success/10 border border-success/20 rounded-sm px-4 py-3 text-center font-[510]">
        ✓ Task completed — no further status updates needed
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
            onClick={() => setConfirmStatus(status)}
            disabled={disabled || updating !== null}
            className="w-full flex items-center justify-between bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md px-4 py-3 hover:shadow-elev-hover hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:translate-y-0 group"
          >
            <span className="text-sm text-fg-primary font-[510] group-hover:text-primary transition-colors">Move to {status}</span>
            {updating === status ? (
              <Loader2 className="w-4 h-4 text-fg-tertiary animate-spin" />
            ) : (
              <ChevronRight className="w-4 h-4 text-fg-quaternary group-hover:text-primary transition-colors group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>
        ))}
      </div>

      {confirmStatus && (
        <div className="dialog-overlay flex items-end sm:items-center justify-center" onClick={() => setConfirmStatus(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-lg w-full sm:max-w-sm p-6 shadow-elev-dialog animate-slide-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
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
    </div>
  );
}
