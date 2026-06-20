"use client";

import { useState } from "react";
import { Plus, X, ExternalLink } from "lucide-react";

const PLATFORMS = [
  "Instagram", "YouTube Shorts", "YouTube", "Snapchat",
  "Facebook", "Google Business Profile", "Custom",
];

interface UrlEntry {
  platform: string;
  url: string;
  label?: string;
}

interface UrlCollectorProps {
  taskId: string;
  onComplete: () => Promise<void>;
  onCancel: () => void;
}

export default function UrlCollector({ taskId, onComplete, onCancel }: UrlCollectorProps) {
  const [entries, setEntries] = useState<UrlEntry[]>([{ platform: "Instagram", url: "" }]);
  const [submitting, setSubmitting] = useState(false);

  function addEntry() {
    setEntries([...entries, { platform: "Instagram", url: "" }]);
  }

  function removeEntry(index: number) {
    setEntries(entries.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, field: keyof UrlEntry, value: string) {
    setEntries(entries.map((e, i) => i === index ? { ...e, [field]: value } : e));
  }

  async function handleSubmit() {
    const valid = entries.filter(e => e.url.trim());
    if (valid.length === 0) {
      await onComplete();
      return;
    }
    setSubmitting(true);
    try {
      for (const e of valid) {
        await fetch(`/api/tasks/${taskId}/urls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: e.platform, url: e.url.trim(), label: e.platform === "Custom" ? (e.label || null) : null }),
        });
      }
      await onComplete();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center animate-fade-in" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-6 shadow-elev-dialog max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink className="w-5 h-5 text-primary" />
          <h3 className="text-heading-3 text-fg-primary">Add Final URLs</h3>
        </div>
        <p className="text-caption text-fg-secondary mb-4">Add platform URLs before completing the task.</p>

        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={i} className="flex gap-2 items-start">
              <select
                value={entry.platform}
                onChange={e => updateEntry(i, "platform", e.target.value)}
                className="select-linear text-label py-1.5 w-[160px] flex-shrink-0 bg-white dark:bg-gray-800"
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="flex-1 space-y-1">
                {entry.platform === "Custom" ? (
                  <input
                    type="text"
                    value={entry.label || ""}
                    onChange={e => updateEntry(i, "label", e.target.value)}
                    className="input-linear w-full text-sm py-1.5"
                    placeholder="Label (e.g. Portfolio)"
                  />
                ) : null}
                <input
                  type="url"
                  value={entry.url}
                  onChange={e => updateEntry(i, "url", e.target.value)}
                  className="input-linear w-full text-sm py-1.5"
                  placeholder={entry.platform === "Custom" ? "https://..." : `https://${entry.platform.toLowerCase().replace(/ /g, "")}.com/...`}
                />
              </div>
              {entries.length > 1 && (
                <button onClick={() => removeEntry(i)} className="p-1.5 text-fg-quaternary hover:text-danger flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button onClick={addEntry} className="mt-3 flex items-center gap-1.5 text-label text-primary hover:text-primary-hover transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add URL
        </button>

        <div className="flex gap-3 mt-6 pt-4 border-t border-border dark:border-gray-700">
          <button onClick={onCancel} className="btn-ghost flex-1">Skip</button>
          <button onClick={handleSubmit} disabled={submitting || entries.every(e => !e.url.trim())} className="btn-primary flex-1">
            {submitting ? "Saving..." : "Save & Complete"}
          </button>
        </div>
      </div>
    </div>
  );
}
