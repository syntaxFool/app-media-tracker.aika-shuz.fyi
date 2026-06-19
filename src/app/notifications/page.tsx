"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout";
import { useRouter } from "next/navigation";
import { Bell, Loader2, CheckCheck, Eye, EyeOff } from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => { if (r.ok) r.json().then((d) => setNotifications(d.notifications)); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function toggleRead(id: number, currentRead: boolean) {
    await fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: !currentRead }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !currentRead } : n))
    );
  }

  async function markAllRead() {
    await fetch("/api/notifications/read", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) return (
    <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-fg-tertiary animate-spin"/></div></AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-primary"/>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent rounded-full" />
              )}
            </div>
            <h1 className="text-heading-3 text-fg-primary dark:text-gray-100">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-caption text-fg-tertiary dark:text-gray-400">{unreadCount} unread</span>
            )}
          </div>

          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-ghost flex items-center gap-1.5 text-label">
              <CheckCheck className="w-3.5 h-3.5"/> Mark All Read
            </button>
          )}
        </div>

        {/* List */}
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">🔔</div>
            <p className="text-body text-fg-secondary dark:text-gray-300">No notifications</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`bg-white dark:bg-gray-900 border rounded-md p-3 shadow-sm group transition-colors ${
                  n.read
                    ? "border-border dark:border-gray-800"
                    : "border-accent/40 dark:border-accent/30 bg-accent/[0.02] dark:bg-accent/[0.03]"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Unread indicator dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${n.read ? "bg-transparent" : "bg-accent"}`}/>
                  </div>

                  {/* Content — click navigates to task */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push(`/tasks/${n.taskId}`)}
                  >
                    <p className={`text-sm ${n.read ? "text-fg-secondary dark:text-gray-400" : "text-fg-primary dark:text-gray-100 font-[510]"}`}>
                      {n.message}
                    </p>
                    <p className="text-tiny text-fg-quaternary dark:text-gray-500 mt-0.5">
                      {new Date(n.createdAt).toLocaleString("en-IN")}
                      <span className="mx-1.5">·</span>
                      <span className="uppercase text-micro tracking-wide">{n.type.replace(/_/g, " ")}</span>
                    </p>
                  </div>

                  {/* Toggle read/unread button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleRead(n.id, n.read); }}
                    className="flex-shrink-0 p-1.5 rounded-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors opacity-0 group-hover:opacity-100"
                    title={n.read ? "Mark unread" : "Mark read"}
                  >
                    {n.read
                      ? <EyeOff className="w-3.5 h-3.5 text-fg-quaternary" />
                      : <Eye className="w-3.5 h-3.5 text-fg-quaternary" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
