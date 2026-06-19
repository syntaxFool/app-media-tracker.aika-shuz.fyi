"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

interface PingAdminButtonProps {
  taskId: string;
  onPinged?: () => void;
}

export default function PingAdminButton({ taskId, onPinged }: PingAdminButtonProps) {
  const [loading, setLoading] = useState(false);
  const [pinged, setPinged] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handlePing() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/ping-admin`, { method: "POST" });
      if (res.ok) {
        setPinged(true);
        onPinged?.();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  if (pinged) {
    return (
      <div className="text-success text-caption bg-success/5 border border-success/10 rounded-sm px-3 py-2">
        ✅ Admin has been notified
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="btn-danger flex items-center gap-2 w-full justify-center py-3"
      >
        <AlertTriangle className="w-4 h-4" />
        Ping Admin
      </button>

      {showConfirm && (
        <div className="dialog-overlay" onClick={() => setShowConfirm(false)}>
          <div className="dialog-content p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-3" />
              <h3 className="text-heading-3 text-fg-primary mb-2">Ping Admin?</h3>
              <p className="text-small text-fg-secondary mb-2">
                This will send a WhatsApp notification to the admin requesting a correction for task{" "}
                <span className="text-fg-primary font-mono">{taskId}</span>.
              </p>
              <p className="text-caption text-fg-tertiary mb-6">
                Use this if you made an incorrect status update and need the admin to revert it.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePing}
                  disabled={loading}
                  className="btn-danger flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? "Sending..." : "Send Alert"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
