// PWA Service Worker — Offline cache + Push notifications
const CACHE_NAME = "shanuzz-tracker-v3";

self.addEventListener("install", (event) => {
  (event as any).waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  (event as any).waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event: any) => {
  if (event.request.url.includes("/api/")) {
    return; // Network-only for API
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// ── Push Notification Handler ───────────────────────────
self.addEventListener("push", (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const promise = (self as any).registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      data: data.data,
      vibrate: [200, 100, 200],
      tag: data.data?.taskId || "default",
      renotify: true,
    });

    event.waitUntil(promise);
  } catch {
    // Fallback: plain text notification
    const promise = (self as any).registration.showNotification("Shanuzz Media Tracker", {
      body: event.data.text(),
      icon: "/icons/icon-192.svg",
    });
    event.waitUntil(promise);
  }
});

// ── Notification Click Handler ──────────────────────────
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    (self as any).clients.matchAll({ type: "window" }).then((clients: any[]) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) {
        existing.focus();
      } else {
        (self as any).clients.openWindow(url);
      }
    })
  );
});
