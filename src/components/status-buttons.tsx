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
            onClick={() => setConfirmStatus(status)}
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

      {confirmStatus && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setConfirmStatus(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-sm p-6 shadow-elev-dialog animate-slide-up" onClick={e => e.stopPropagation()}>
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
