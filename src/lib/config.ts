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
export const DEFAULTS: AppConfigShape = {
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
  } catch (e) {
    console.error("Config DB error, using fallback:", e);
  }

  return DEFAULTS[key];
}

export async function setConfig<K extends keyof AppConfigShape>(
  key: K,
  value: AppConfigShape[K],
  updatedBy: string,
): Promise<void> {
  // Bust cache before write to avoid stale-read window
  cache.delete(key);

  await prisma.appConfig.upsert({
    where: { key },
    update: { value: value as any, updatedBy },
    create: { key, value: value as any, updatedBy },
  });
}

/** Fetch all config at once (for the settings page) */
export async function getAllConfig(): Promise<{ key: string; value: any }[]> {
  try {
    const rows = await prisma.appConfig.findMany();
    // Also seed cache
    for (const row of rows) cache.set(row.key, row.value);
    return rows.map(r => ({ key: r.key, value: r.value }));
  } catch (e) {
    console.error("Config DB error, using fallback:", e);
    return Object.entries(DEFAULTS).map(([key, value]) => ({ key, value }));
  }
}

/** Invalidate entire cache */
export function clearConfigCache(): void {
  cache.clear();
}

