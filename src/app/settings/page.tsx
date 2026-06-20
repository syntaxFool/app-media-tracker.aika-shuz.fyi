"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout";
import { Bell, Smartphone, Package } from "lucide-react";

export default function SettingsPage() {
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") setPushPermission(Notification.permission);
  }, []);

  async function handleEnableNotifications() {
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission === "granted" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY || "BJx07W4rWR8uwiVSiC1C2N3Xh1JQCZh1SK8RGWdrYg--SDYK40D16sp0pGkdB02cJeZazhqWIpJmF6Fiyb2K0DE";
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey });
      const raw = sub.toJSON();
      if (raw.endpoint && raw.keys) {
        await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: raw.endpoint, p256dh: raw.keys.p256dh, auth: raw.keys.auth }) });
      }
    }
  }

  return (
    <AppLayout>
      <div className="p-4 max-w-xl mx-auto space-y-4">
        <h1 className="text-heading-2 text-fg-primary">Settings</h1>

        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-fg-tertiary" />
              <div>
                <p className="text-sm font-[510] text-fg-primary">Notifications</p>
                <p className="text-tiny text-fg-quaternary">Push alerts for task updates</p>
              </div>
            </div>
            {pushPermission === "granted" ? (
              <span className="text-tiny text-success font-[510]">Enabled</span>
            ) : pushPermission === "denied" ? (
              <span className="text-tiny text-danger font-[510]">Blocked</span>
            ) : (
              <button onClick={handleEnableNotifications} className="btn-primary text-label px-3 py-1.5 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" /> Enable
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-fg-tertiary" />
            <div>
              <p className="text-sm font-[510] text-fg-primary">Shanuzz Media Tracker</p>
              <p className="text-tiny text-fg-quaternary font-mono">v1.0.1</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
