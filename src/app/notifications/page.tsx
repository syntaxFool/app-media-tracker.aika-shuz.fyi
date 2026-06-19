"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => { if (r.ok) r.json().then((d) => setNotifications(d.notifications)); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-fg-tertiary animate-spin"/></div></AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary"/>
          <h1 className="text-heading-3 text-fg-primary dark:text-gray-100">Notifications</h1>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">🔔</div>
            <p className="text-body text-fg-secondary dark:text-gray-300">No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => router.push(`/tasks/${n.taskId}`)}
                className={`bg-white dark:bg-gray-900 border rounded-md p-3 cursor-pointer transition-colors shadow-sm ${
                  n.read ? "border-border dark:border-gray-800 opacity-60" : "border-accent/30 dark:border-accent/20"
                }`}
              >
                <p className="text-sm text-fg-primary dark:text-gray-200">{n.message}</p>
                <p className="text-tiny text-fg-quaternary mt-1">
                  {new Date(n.createdAt).toLocaleString("en-IN")} · {n.type}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
