"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/layout";
import { Loader2, Save, RotateCcw, CheckCircle2, AlertTriangle, Shield } from "lucide-react";

interface ConfigEntry {
  key: string;
  value: any;
}

const CATEGORY_LABELS: Record<string, string> = {
  branding: "Branding & Identity",
  services: "Service Options",
  genders: "Gender Options",
  platforms: "URL Platforms",
  status_responsible: "Status → Responsible Assignment",
};

const CATEGORY_DESC: Record<string, string> = {
  branding: "App name, task ID prefix, and version display",
  services: "Dropdown options when creating/editing a task",
  genders: "Dropdown options for gender selection",
  platforms: "Available platforms when collecting final URLs",
  status_responsible: "Which role is responsible for each status in the workflow",
};

// Default values for "Reset to defaults" (must match prisma/seed.ts & lib/config.ts)
const DEFAULTS: Record<string, any> = {
  services: ["Treatment","Haircut","Perming","Patch","Dread lock","Braid","Brand promo","Other"],
  genders: ["Male","Female","Other"],
  platforms: ["Instagram","YouTube Shorts","YouTube","Snapchat","Facebook","Google Business Profile","Custom"],
  branding: { appName: "Shanuzz Tracker", appFullName: "Shanuzz Media Tracker", taskIdPrefix: "SHANUZZ", version: "1.1.0" },
  status_responsible: { "New": "Admin", "Video Shot": "Videographer", "Data Copied": "Editor", "Video Edited": "Reviewer", "Reviewed": "Uploader", "Approved": "Admin", "Uploaded": "Admin", "Task Completed": "—", "Dropped": "—" },
};

export default function SuSettingsPage() {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
      } else {
        showToast("Failed to load config — unauthorized or server error", "error");
      }
    } catch (err) {
      console.error("Failed to fetch configs", err);
      showToast("Network error loading config", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  function startEditing(key: string, currentValue: any) {
    setEditingKey(key);
    // Deep clone — guard against undefined (unsaved/partial seed)
    setEditValue(currentValue ? JSON.parse(JSON.stringify(currentValue)) : {});
  }

  function cancelEditing() {
    setEditingKey(null);
    setEditValue(null);
  }

  async function resetToDefaults(key: string) {
    if (!confirm(`Reset all ${CATEGORY_LABELS[key]} values to their defaults?`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: DEFAULTS[key as keyof typeof DEFAULTS] }),
      });
      if (!res.ok) throw new Error("Reset failed");
      setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: DEFAULTS[key as keyof typeof DEFAULTS] } : c));
      setEditingKey(null);
      setEditValue(null);
      showToast(`${CATEGORY_LABELS[key]} reset to defaults`);
    } catch {
      showToast("Reset failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveConfig(key: string) {
    // Confirm for branding changes
    if (key === "branding" && !confirm("Changing branding affects the entire app (header, login page, notifications, task IDs). Continue?")) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: editValue }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: editValue } : c));
      setEditingKey(null);
      setEditValue(null);
      showToast(`${CATEGORY_LABELS[key] || key} updated successfully`);
    } catch (err: any) {
      showToast(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  function renderArrayEditor(value: string[]) {
    const text = Array.isArray(value) ? value.join("\n") : "";
    return (
      <textarea
        value={text}
        onChange={e => setEditValue(e.target.value.split("\n").filter(s => s.trim()))}
        className="input-linear w-full min-h-[120px] text-sm font-mono"
        placeholder="One item per line..."
        rows={Math.max((value || []).length + 2, 5)}
      />
    );
  }

  function renderObjectEditor(value: Record<string, string>) {
    const entries = Object.entries(value || {});
    return (
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-sm font-mono text-fg-tertiary dark:text-gray-400 w-36 flex-shrink-0 truncate">{k}</span>
            <input
              type="text"
              value={v as string}
              onChange={e => {
                const next = { ...editValue, [k]: e.target.value };
                setEditValue(next);
              }}
              className="input-linear flex-1 text-sm"
            />
          </div>
        ))}
      </div>
    );
  }

  function renderBrandingEditor(value: any) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-label text-fg-tertiary dark:text-gray-400 mb-1">Short App Name (header)</label>
          <input
            type="text"
            value={value?.appName || ""}
            onChange={e => setEditValue({ ...editValue, appName: e.target.value })}
            className="input-linear w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-label text-fg-tertiary dark:text-gray-400 mb-1">Full App Name (login page, push)</label>
          <input
            type="text"
            value={value?.appFullName || ""}
            onChange={e => setEditValue({ ...editValue, appFullName: e.target.value })}
            className="input-linear w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-label text-fg-tertiary dark:text-gray-400 mb-1">Task ID Prefix</label>
          <input
            type="text"
            value={value?.taskIdPrefix || ""}
            onChange={e => setEditValue({ ...editValue, taskIdPrefix: e.target.value })}
            className="input-linear w-40 text-sm font-mono"
            placeholder="SHANUZZ"
          />
        </div>
        <div>
          <label className="block text-label text-fg-tertiary dark:text-gray-400 mb-1">Version</label>
          <input
            type="text"
            value={value?.version || ""}
            onChange={e => setEditValue({ ...editValue, version: e.target.value })}
            className="input-linear w-32 text-sm"
          />
        </div>
      </div>
    );
  }

  function renderEditArea(key: string, value: any) {
    switch (key) {
      case "branding":
        return renderBrandingEditor(value);
      case "services":
      case "genders":
      case "platforms":
        return renderArrayEditor(value as string[]);
      case "status_responsible":
        return renderObjectEditor(value as Record<string, string>);
      default:
        return (
          <textarea
            value={JSON.stringify(editValue, null, 2)}
            onChange={e => {
              try { setEditValue(JSON.parse(e.target.value)); } catch { /* invalid JSON while typing */ }
            }}
            className="input-linear w-full min-h-[200px] text-sm font-mono"
          />
        );
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-fg-tertiary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {toast && (
        <div role="status" aria-live="polite" className="fixed top-4 right-4 z-[9999] animate-fade-in">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-md shadow-elev-dialog text-sm font-[510] ${
            toast.type === "success"
              ? "bg-success/10 text-success border border-success/20"
              : "bg-danger/10 text-danger border border-danger/20"
          }`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.message}
          </div>
        </div>
      )}

      <div className="p-4 max-w-3xl mx-auto space-y-5 animate-fade-in pb-32">
        {/* Page heading */}
        <div className="page-heading">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-amber-500" />
            <h1 className="text-heading-2 text-fg-primary dark:text-white font-semibold">SU Settings</h1>
          </div>
          <p className="text-caption text-fg-tertiary dark:text-gray-400">
            Manage global application configuration. Changes take effect immediately.
          </p>
        </div>

        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const config = configs.find(c => c.key === key);
          const isEditing = editingKey === key;
          const value = config?.value;

          return (
            <div key={key} className="section-card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-label font-[590] text-fg-primary dark:text-gray-100">{label}</h3>
                  <p className="text-tiny text-fg-quaternary dark:text-gray-500 mt-0.5">{CATEGORY_DESC[key]}</p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => startEditing(key, value)}
                    className="btn-subtle text-label px-3 py-1.5"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditing}
                      disabled={saving}
                      className="btn-ghost text-label px-3 py-1.5 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button
                      onClick={() => resetToDefaults(key)}
                      disabled={saving}
                      className="btn-ghost text-label px-3 py-1.5 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-1"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => saveConfig(key)}
                      disabled={saving}
                      className="btn-primary text-label px-3 py-1.5 flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>

              {!isEditing && value && (
                <div className="bg-surface dark:bg-gray-800 rounded-sm p-3 border border-border/50 dark:border-gray-700">
                  {key === "branding" && value ? (
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span><span className="text-fg-quaternary dark:text-gray-500">Name:</span> <span className="font-[510] text-fg-primary dark:text-gray-100">{value.appName}</span></span>
                      <span><span className="text-fg-quaternary dark:text-gray-500">Full:</span> <span className="font-[510] text-fg-primary dark:text-gray-100">{value.appFullName}</span></span>
                      <span><span className="text-fg-quaternary dark:text-gray-500">Prefix:</span> <code className="text-fg-primary dark:text-gray-100">{value.taskIdPrefix}</code></span>
                      <span><span className="text-fg-quaternary dark:text-gray-500">Version:</span> <span className="font-[510] text-fg-primary dark:text-gray-100">v{value.version}</span></span>
                    </div>
                  ) : key === "status_responsible" && value ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {Object.entries(value as Record<string, string>).map(([status, person]) => (
                        <span key={status}>
                          <span className="text-fg-quaternary dark:text-gray-500">{status}:</span>{" "}
                          <span className="font-[510] text-fg-primary dark:text-gray-100">{person as string}</span>
                        </span>
                      ))}
                    </div>
                  ) : Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {value.map((item: string) => (
                        <span key={item} className="text-sm bg-white dark:bg-gray-900 px-2 py-0.5 rounded-sm border border-border dark:border-gray-700 text-fg-primary dark:text-gray-100">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <pre className="text-sm text-fg-secondary dark:text-gray-300 font-mono whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="bg-surface dark:bg-gray-800 rounded-sm p-3 border border-accent/40 dark:border-accent/30 ring-1 ring-accent/10">
                  {renderEditArea(key, editValue)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
