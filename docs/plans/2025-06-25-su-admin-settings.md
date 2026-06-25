# SU-Admin Configurable Settings Page — Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build an SU-only settings page that lets the superuser manage all currently-hardcoded configuration (services, genders, platforms, branding, task ID prefix, status-responsible mapping, app name) via a database-backed config system, eliminating the need to redeploy for config changes.

**Architecture:** A new `AppConfig` table stores key-value configuration as JSON. The frontend fetches config via an API and caches it in React context. The SU settings page provides form-based CRUD for each config category. Existing hardcoded arrays are refactored to load from the config service with compile-time fallbacks matching current values.

**Tech Stack:** Next.js (App Router), Prisma/PostgreSQL, React, TypeScript, Tailwind CSS

---

## Phase 1: Database & API Foundation

### Task 1: Add AppConfig model to Prisma schema

**TDD scenario:** Trivial database migration — no tests needed, verify with `prisma migrate`

**Files:**
- Modify: `prisma/schema.prisma` — add model after `PushSubscription`

**Step 1: Add the model**

```prisma
model AppConfig {
  key       String   @id // e.g. "services", "genders", "platforms", "branding", "status_responsible"
  value     Json     // the config data as JSON
  updatedBy String   @map("updated_by")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("app_config")
}
```

**Step 2: Run migration**

```bash
npx prisma migrate dev --name add_app_config
```
Expected: migration created, `app_config` table appears in DB.

**Step 3: Seed default config values**

Modify `prisma/seed.ts` — add after user seeding, before sample tasks:

```ts
// ── Seed default app config ──
const defaultConfigs = [
  { key: "services", value: ["Treatment","Haircut","Perming","Patch","Dread lock","Braid","Brand promo","Other"] },
  { key: "genders", value: ["Male","Female","Other"] },
  { key: "platforms", value: ["Instagram","YouTube Shorts","YouTube","Snapchat","Facebook","Google Business Profile","Custom"] },
  { key: "branding", value: { appName: "Shanuzz Tracker", appFullName: "Shanuzz Media Tracker", taskIdPrefix: "SHANUZZ", version: "1.1.0" } },
  { key: "status_responsible", value: { "New": "Admin", "Video Shot": "Videographer", "Data Copied": "Editor", "Video Edited": "Reviewer", "Reviewed": "Uploader", "Approved": "Admin", "Uploaded": "Admin", "Task Completed": "—", "Dropped": "—" } },
];

for (const cfg of defaultConfigs) {
  await prisma.appConfig.upsert({
    where: { key: cfg.key },
    update: {},
    create: { key: cfg.key, value: cfg.value, updatedBy: "su" },
  });
}
console.log("  ✅ Default app configs seeded");
```

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts prisma/migrations/
git commit -m "feat: add AppConfig model for db-backed settings"
```

---

### Task 2: Create config service library

**TDD scenario:** New utility — write it well, test manually via API

**Files:**
- Create: `src/lib/config.ts`

**Step 1: Write the config service**

```ts
// ── App Config Service ────────────────────────────────
import prisma from "./db";

// Type-safe config keys and their value shapes
export interface AppConfigShape {
  services: string[];
  genders: string[];
  platforms: string[];
  branding: {
    appName: string;
    appFullName: string;
    taskIdPrefix: string;
    version: string;
  };
  status_responsible: Record<string, string>;
}

// Fallback defaults — must match current hardcoded values
// Used when DB is unavailable, during build, or as initial seed
const DEFAULTS: AppConfigShape = {
  services: ["Treatment","Haircut","Perming","Patch","Dread lock","Braid","Brand promo","Other"],
  genders: ["Male","Female","Other"],
  platforms: ["Instagram","YouTube Shorts","YouTube","Snapchat","Facebook","Google Business Profile","Custom"],
  branding: {
    appName: "Shanuzz Tracker",
    appFullName: "Shanuzz Media Tracker",
    taskIdPrefix: "SHANUZZ",
    version: "1.1.0",
  },
  status_responsible: {
    New: "Admin",
    "Video Shot": "Videographer",
    "Data Copied": "Editor",
    "Video Edited": "Reviewer",
    Reviewed: "Uploader",
    Approved: "Admin",
    Uploaded: "Admin",
    "Task Completed": "—",
    Dropped: "—",
  },
};

// In-memory cache (per server instance — cleared on restart)
const cache = new Map<string, any>();

export async function getConfig<K extends keyof AppConfigShape>(key: K): Promise<AppConfigShape[K]> {
  // Return cached value if available
  if (cache.has(key)) return cache.get(key) as AppConfigShape[K];

  try {
    const row = await prisma.appConfig.findUnique({ where: { key } });
    if (row) {
      const value = row.value as unknown as AppConfigShape[K];
      cache.set(key, value);
      return value;
    }
  } catch { /* DB unavailable — use fallback */ }

  return DEFAULTS[key];
}

export async function setConfig<K extends keyof AppConfigShape>(
  key: K,
  value: AppConfigShape[K],
  updatedBy: string,
): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key },
    update: { value: value as any, updatedBy },
    create: { key, value: value as any, updatedBy },
  });
  // Bust cache
  cache.delete(key);
}

/** Fetch all config at once (for the settings page) */
export async function getAllConfig(): Promise<{ key: string; value: any }[]> {
  try {
    const rows = await prisma.appConfig.findMany();
    // Also seed cache
    for (const row of rows) cache.set(row.key, row.value);
    return rows.map(r => ({ key: r.key, value: r.value }));
  } catch {
    return Object.entries(DEFAULTS).map(([key, value]) => ({ key, value }));
  }
}

/** Invalidate entire cache */
export function clearConfigCache(): void {
  cache.clear();
}

export { DEFAULTS };
```

**Step 2: Commit**

```bash
git add src/lib/config.ts
git commit -m "feat: add config service with db-backed cache and fallbacks"
```

---

### Task 3: Create SU-only config API routes

**TDD scenario:** New API — manual testing only

**Files:**
- Create: `src/app/api/admin/config/route.ts` (handles GET all + PUT individual)

**Step 1: Write the API route**

```ts
// GET  /api/admin/config — fetch all config (SU only)
// PUT  /api/admin/config — upsert a config key (SU only)
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAllConfig, setConfig, AppConfigShape } from "@/lib/config";

export async function GET() {
  try {
    const session = await requireAuth();
    if (session.role !== "su") {
      return NextResponse.json({ error: "Superuser access required" }, { status: 403 });
    }
    const configs = await getAllConfig();
    return NextResponse.json({ configs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "su") {
      return NextResponse.json({ error: "Superuser access required" }, { status: 403 });
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }

    // Validate key is one of the known config keys
    const validKeys = Object.keys({
      services: true, genders: true, platforms: true,
      branding: true, status_responsible: true,
    });
    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: `Invalid config key: ${key}` }, { status: 400 });
    }

    await setConfig(key as keyof AppConfigShape, value, session.username);
    return NextResponse.json({ success: true, key });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

**Step 2: Add middleware protection for /api/admin routes**

Modify `src/middleware.ts` — add `"/api/admin"` to `ADMIN_API_PREFIXES`:
```ts
const ADMIN_API_PREFIXES = ["/api/users", "/api/analytics", "/api/admin"];
```

Note: We then rely on the route handler itself to enforce `role === "su"` specifically.

**Step 3: Commit**

```bash
git add src/app/api/admin/config/route.ts src/middleware.ts
git commit -m "feat: add SU-only config CRUD API endpoint"
```

---

## Phase 2: SU Settings UI Page

### Task 4: Create the SU-Admin Settings page

**TDD scenario:** New page — visual verification

**Files:**
- Create: `src/app/admin/settings/page.tsx`

**Step 1: Build the settings page UI**

The page has sections for each config category:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout";
import { Loader2, Save, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";

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

export default function SuSettingsPage() {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
      } else if (res.status === 403) {
        // Not SU — redirect will happen via layout/middleware
      }
    } catch (err) {
      console.error("Failed to fetch configs", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  function startEditing(key: string, currentValue: any) {
    setEditingKey(key);
    // Deep clone for arrays/objects
    setEditValue(JSON.parse(JSON.stringify(currentValue)));
  }

  function cancelEditing() {
    setEditingKey(null);
    setEditValue(null);
  }

  async function saveConfig(key: string) {
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
      // Update local state
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

  function getConfigByKey(key: string): any {
    return configs.find(c => c.key === key)?.value;
  }

  // ── Render helpers for different value types ──

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
            <span className="text-sm font-mono text-fg-tertiary w-36 flex-shrink-0 truncate">{k}</span>
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
          <label className="block text-label text-fg-tertiary mb-1">Short App Name (header)</label>
          <input
            type="text"
            value={value?.appName || ""}
            onChange={e => setEditValue({ ...editValue, appName: e.target.value })}
            className="input-linear w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-label text-fg-tertiary mb-1">Full App Name (login page, push)</label>
          <input
            type="text"
            value={value?.appFullName || ""}
            onChange={e => setEditValue({ ...editValue, appFullName: e.target.value })}
            className="input-linear w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-label text-fg-tertiary mb-1">Task ID Prefix</label>
          <input
            type="text"
            value={value?.taskIdPrefix || ""}
            onChange={e => setEditValue({ ...editValue, taskIdPrefix: e.target.value })}
            className="input-linear w-40 text-sm font-mono"
            placeholder="SHANUZZ"
          />
        </div>
        <div>
          <label className="block text-label text-fg-tertiary mb-1">Version</label>
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
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] animate-fade-in">
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

      <div className="p-4 max-w-3xl mx-auto space-y-5 animate-fade-in pb-24">
        {/* Header */}
        <div>
          <h1 className="text-heading-2 text-fg-primary dark:text-white font-semibold">SU Settings</h1>
          <p className="text-caption text-fg-tertiary dark:text-gray-400 mt-1">
            Manage global application configuration. Changes take effect immediately.
          </p>
        </div>

        {/* Config cards */}
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const config = configs.find(c => c.key === key);
          const isEditing = editingKey === key;
          const value = config?.value;

          return (
            <div key={key} className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm">
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
                      onClick={() => saveConfig(key)}
                      disabled={saving}
                      className="btn-primary text-label px-3 py-1.5 flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>

              {/* Read-only display */}
              {!isEditing && (
                <div className="bg-surface dark:bg-gray-800 rounded-sm p-3 border border-border/50 dark:border-gray-700">
                  {key === "branding" && value ? (
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span><span className="text-fg-quaternary">Name:</span> <span className="font-[510] text-fg-primary">{value.appName}</span></span>
                      <span><span className="text-fg-quaternary">Full:</span> <span className="font-[510] text-fg-primary">{value.appFullName}</span></span>
                      <span><span className="text-fg-quaternary">Prefix:</span> <code className="text-fg-primary">{value.taskIdPrefix}</code></span>
                      <span><span className="text-fg-quaternary">Version:</span> <span className="font-[510] text-fg-primary">v{value.version}</span></span>
                    </div>
                  ) : key === "status_responsible" && value ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {Object.entries(value as Record<string, string>).map(([status, person]) => (
                        <span key={status}>
                          <span className="text-fg-quaternary">{status}:</span>{" "}
                          <span className="font-[510] text-fg-primary">{person as string}</span>
                        </span>
                      ))}
                    </div>
                  ) : Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {value.map((item: string) => (
                        <span key={item} className="text-sm bg-white dark:bg-gray-900 px-2 py-0.5 rounded-sm border border-border dark:border-gray-700 text-fg-primary">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <pre className="text-sm text-fg-secondary font-mono whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                  )}
                </div>
              )}

              {/* Edit area */}
              {isEditing && (
                <div className="bg-surface dark:bg-gray-800 rounded-sm p-3 border border-accent/30 dark:border-accent/30">
                  {renderEditArea(key, value)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
```

**Step 2: Add "SU Settings" nav entry for su users only**

Modify `src/components/layout.tsx`:

In the dropdown menu, add after "User Management":
```tsx
{(user?.role === "su") && (
  <button onClick={() => { router.push("/admin/settings"); setMenuOpen(false); }}
    className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-surface dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors">
    <Shield className="w-4 h-4" />
    SU Settings
  </button>
)}
```

Add `Shield` to the lucide-react imports:
```tsx
import { ..., Shield } from "lucide-react";
```

In the sidebar, add an SU-only nav item:
```tsx
...(user?.role === "su"
  ? [{ path: "/admin/settings", label: "SU Settings", icon: Shield }]
  : []),
```

**Step 3: Verify the page loads**

- Login as `su` → navigate to `/admin/settings` → see config cards
- Login as `admin` → `/admin/settings` → redirected to `/` by middleware
- Login as `staff` → not visible in nav

**Step 4: Commit**

```bash
git add src/app/admin/settings/page.tsx src/components/layout.tsx
git commit -m "feat: add SU settings page with CRUD for all config categories"
```

---

## Phase 3: Refactor Hardcoded Values → Config Service

### Task 5: Replace hardcoded SERVICES and GENDERS with config fetches

**TDD scenario:** Modifying tested code — run existing tests first (if any), then verify manually

**Files:**
- Modify: `src/components/task-form.tsx` (lines 5-6)
- Modify: `src/components/filter-bar.tsx` (gender options)
- Modify: `src/app/page.tsx` (filter options)
- Create: `src/lib/config-client.ts` (client-safe config fetching)

**Step 1: Create a client-side config hook**

File: `src/hooks/use-app-config.ts`

```ts
"use client";

import { useState, useEffect } from "react";

// Fallback values used before API responds — must match db seed / old hardcodes
const CLIENT_FALLBACKS = {
  services: ["Treatment","Haircut","Perming","Patch","Dread lock","Braid","Brand promo","Other"],
  genders: ["Male","Female","Other"],
  platforms: ["Instagram","YouTube Shorts","YouTube","Snapchat","Facebook","Google Business Profile","Custom"],
  branding: {
    appName: "Shanuzz Tracker",
    appFullName: "Shanuzz Media Tracker",
    taskIdPrefix: "SHANUZZ",
    version: "1.1.0",
  },
  status_responsible: {} as Record<string, string>,
};

export function useAppConfig() {
  const [config, setConfig] = useState(CLIENT_FALLBACKS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config")
      .then(r => {
        if (!r.ok) throw new Error("Not authorized or failed");
        return r.json();
      })
      .then(data => {
        const configs = data.configs || [];
        const merged: any = { ...CLIENT_FALLBACKS };
        for (const c of configs) {
          merged[c.key] = c.value;
        }
        setConfig(merged);
      })
      .catch(() => {
        // Non-su users get 403 — fall through to fallbacks
      })
      .finally(() => setLoaded(true));
  }, []);

  return { config, loaded };
}
```

**Step 2: Refactor task-form.tsx**

Remove the hardcoded lines:
```ts
// DELETE:
const SERVICES = ["Treatment","Haircut","Perming","Patch","Dread lock","Braid","Brand promo","Other"];
const GENDERS = ["Male","Female","Other"];
```

Add the hook:
```tsx
import { useAppConfig } from "@/hooks/use-app-config";

// Inside TaskForm component:
const { config } = useAppConfig();
const SERVICES = config.services;
const GENDERS = config.genders;
```

**Step 3: Refactor filter-bar.tsx**

The gender options are hardcoded inline. Change to accept from parent via `useAppConfig` or accept a `genders` prop. The FilterBar already receives `services` as a prop — add `genders` prop too:

```tsx
interface FilterBarProps {
  // ... existing fields
  genders: string[];  // NEW
}
```

Then use `{genders.map(...)}` instead of hardcoded Male/Female/Other.

**Step 4: Refactor page.tsx (dashboard filters)**

Same pattern — use `useAppConfig()` for genders and services.

**Step 5: Refactor url-collector.tsx**

Replace `PLATFORMS` constant with `useAppConfig().config.platforms`.

**Step 6: Refactor lib/tasks.ts (getResponsibleForStatus)**

```ts
// Before (hardcoded):
export function getResponsibleForStatus(status: string): string {
  const map: Record<string, string> = {
    New: "Admin", "Video Shot": "Videographer", ...
  };
  return map[status] || "Admin";
}

// After (async, fetches from config):
import { getConfig } from "./config";

export async function getResponsibleForStatus(status: string): Promise<string> {
  const map = await getConfig("status_responsible");
  return map[status] || "Admin";
}
```

Update the callers in `src/app/api/tasks/[id]/route.ts` to `await`:
```ts
// Before:
nextResponsible: getResponsibleForStatus(status),

// After:
nextResponsible: await getResponsibleForStatus(status),
```

**Step 7: Refactor branding references**

Update `src/components/layout.tsx` to use dynamic app name:
```tsx
// Before:
<span className="text-body-sb ...">Shanuzz Tracker</span>

// After — use config hook:
const { config } = useAppConfig();
// ...
<span className="...">{config.branding.appName}</span>
```

Update `src/app/login/page.tsx`:
```tsx
const { config } = useAppConfig();
// ...
<h1 className="...">{config.branding.appFullName}</h1>
```

Update `src/lib/push.ts` title to use dynamic config (or keep static since push.ts is server-side and config is async — use the DEFAULTS from config.ts).

**Step 8: Refactor task ID prefix**

Update `src/lib/tasks.ts` `generateTaskId()` to use config:
```ts
// Before:
const prefix = "SHANUZZ-";
// parse last.id.replace("SHANUZZ-", "")

// After:
import { getConfig } from "./config";
export async function generateTaskId(): Promise<string> {
  const branding = await getConfig("branding");
  const prefix = branding.taskIdPrefix;
  // ...
}
```

Update caller in `src/app/api/tasks/route.ts` to `await generateTaskId()`.

**Step 9: Commit**

```bash
git add src/hooks/use-app-config.ts src/components/task-form.tsx src/components/filter-bar.tsx \
        src/components/url-collector.tsx src/app/page.tsx src/lib/tasks.ts \
        src/app/api/tasks/[id]/route.ts src/app/api/tasks/route.ts \
        src/components/layout.tsx src/app/login/page.tsx
git commit -m "refactor: replace hardcoded config with db-backed config service"
```

---

## Phase 4: Edge Cases & Polish

### Task 6: Handle edge cases and UX polish

**TDD scenario:** Trivial changes — visual verification

**Files:**
- Modify: `src/app/admin/settings/page.tsx` (add confirm dialog for branding changes, validation)
- Modify: `src/components/layout.tsx` (add loading state)
- Modify: `src/app/api/admin/config/route.ts` (add validation)

**Step 1: Add validation to API**

In the PUT handler, add type-specific validation:
```ts
// Validate value shape before saving
if (key === "branding") {
  if (!value.appName || !value.appFullName || !value.taskIdPrefix) {
    return NextResponse.json({ error: "branding requires appName, appFullName, taskIdPrefix" }, { status: 400 });
  }
}
if (["services", "genders", "platforms"].includes(key)) {
  if (!Array.isArray(value) || value.length === 0) {
    return NextResponse.json({ error: `${key} must be a non-empty array` }, { status: 400 });
  }
}
if (key === "status_responsible") {
  if (typeof value !== "object" || Object.keys(value).length === 0) {
    return NextResponse.json({ error: "status_responsible must be a non-empty object" }, { status: 400 });
  }
}
```

**Step 2: Add confirm dialog for branding changes**

Since branding changes affect app identity, add a confirmation step:
```tsx
const [confirmBranding, setConfirmBranding] = useState(false);

// In saveConfig, before saving branding:
if (key === "branding" && !confirmBranding) {
  setConfirmBranding(true);
  return;
}
// After save: setConfirmBranding(false);
```

**Step 3: Add "Reset to Defaults" button per category**

```tsx
import { DEFAULTS } from "@/lib/config";

// ...
async function resetToDefault(key: string) {
  if (!confirm(`Reset ${CATEGORY_LABELS[key]} to default values?`)) return;
  const defaults = (DEFAULTS as any)[key];
  startEditing(key, defaults);
  // Auto-save
  setEditValue(JSON.parse(JSON.stringify(defaults)));
  setSaving(true);
  try {
    await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: defaults }),
    });
    setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: defaults } : c));
    setEditingKey(null);
    showToast(`${CATEGORY_LABELS[key]} reset to defaults`);
  } catch { showToast("Reset failed", "error"); } finally { setSaving(false); }
}
```

**Step 4: Verify all paths**

- Login as `su`, visit `/admin/settings`, edit each category, save, verify changes appear
- Login as `su`, create a new task — verify service/gender dropdowns reflect changes
- Login as `su`, edit branding → verify app name changes in header and login page
- Login as `su`, change task ID prefix → create task → verify new prefix used
- Login as `admin`, verify no SU settings nav, 403 on API, `/admin/settings` redirects

**Step 5: Commit**

```bash
git add src/app/admin/settings/page.tsx src/app/api/admin/config/route.tsx
git commit -m "feat: add validation, defaults reset, and confirm dialog for SU settings"
```

---

## Summary of All Changes

| # | File | Action |
|---|------|--------|
| 1 | `prisma/schema.prisma` | Add `AppConfig` model |
| 2 | `prisma/seed.ts` | Seed default configs |
| 3 | `src/lib/config.ts` | New config service with cache |
| 4 | `src/app/api/admin/config/route.ts` | New SU-only config API |
| 5 | `src/middleware.ts` | Add `/api/admin` to admin prefixes |
| 6 | `src/app/admin/settings/page.tsx` | New SU settings page |
| 7 | `src/components/layout.tsx` | Add SU nav entry + dynamic app name |
| 8 | `src/hooks/use-app-config.ts` | New client config hook |
| 9 | `src/components/task-form.tsx` | Use config for services/genders |
| 10 | `src/components/filter-bar.tsx` | Use config for genders |
| 11 | `src/components/url-collector.tsx` | Use config for platforms |
| 12 | `src/app/page.tsx` | Use config for dropdowns |
| 13 | `src/app/login/page.tsx` | Use config for app name |
| 14 | `src/lib/tasks.ts` | Use config for task ID prefix + responsible map |
| 15 | `src/app/api/tasks/route.ts` | Await async generateTaskId |
| 16 | `src/app/api/tasks/[id]/route.ts` | Await async getResponsibleForStatus |

---

## Config Keys Reference

| Key | Type | Default | Used By |
|-----|------|---------|---------|
| `services` | `string[]` | `["Treatment","Haircut","Perming","Patch","Dread lock","Braid","Brand promo","Other"]` | task-form, filter-bar, page.tsx |
| `genders` | `string[]` | `["Male","Female","Other"]` | task-form, filter-bar, page.tsx |
| `platforms` | `string[]` | `["Instagram","YouTube Shorts","YouTube","Snapchat","Facebook","Google Business Profile","Custom"]` | url-collector.tsx |
| `branding` | `{appName, appFullName, taskIdPrefix, version}` | `{appName:"Shanuzz Tracker", appFullName:"Shanuzz Media Tracker", taskIdPrefix:"SHANUZZ", version:"1.1.0"}` | layout.tsx, login, push.ts, tasks.ts |
| `status_responsible` | `Record<string,string>` | `{New:"Admin", "Video Shot":"Videographer", ...}` | tasks.ts, wa-bot/index.ts |
