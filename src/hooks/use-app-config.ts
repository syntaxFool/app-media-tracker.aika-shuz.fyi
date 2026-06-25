"use client";

import { useState, useEffect } from "react";

// Client fallback values matching the seeded defaults
const CLIENT_FALLBACKS = {
  services: ["Treatment","Haircut","Perming","Patch","Dread lock","Braid","Brand promo","Other"] as string[],
  genders: ["Male","Female","Other"] as string[],
  platforms: ["Instagram","YouTube Shorts","YouTube","Snapchat","Facebook","Google Business Profile","Custom"] as string[],
  branding: {
    appName: "Shanuzz Tracker" as string,
    appFullName: "Shanuzz Media Tracker" as string,
    taskIdPrefix: "SHANUZZ" as string,
    version: "1.1.0" as string,
  },
  status_responsible: {} as Record<string, string>,
};

type AppConfigClient = typeof CLIENT_FALLBACKS;

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfigClient>(CLIENT_FALLBACKS);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/config", { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch config");
        return r.json();
      })
      .then(data => {
        const configs = data.configs || [];
        const merged = { ...CLIENT_FALLBACKS };
        for (const c of configs) {
          if (c.key in merged) {
            (merged as any)[c.key] = c.value;
          }
        }
        setConfig(merged);
      })
      .catch(() => {
        // Fall through to fallbacks on fetch failure or abort
      });

    return () => controller.abort();
  }, []);

  return { config };
}
