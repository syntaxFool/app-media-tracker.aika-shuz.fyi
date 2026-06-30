"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Columns, History, LogOut, Plus, Sun, Moon, BarChart3, Bell, MoreVertical, Users, Settings, Shield,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAppConfig } from "@/hooks/use-app-config";

interface User {
  id: number; username: string; displayName: string; role: "su" | "admin" | "staff";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const pathname = usePathname();
  const { config: appConfig } = useAppConfig();
  const [user, setUser] = useState<User | null>(null);
  const { theme, toggle } = useTheme();
  const [notifCount, setNotifCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) setUser((await res.json()).user);
      else router.push("/login");
    } catch {}
  }, [router]);

  useEffect(() => { fetchUser(); }, [fetchUser, pathname]);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof Notification !== "undefined") setPushPermission(Notification.permission);
  }, []);

  // Subscribe to push notifications (only on user click, not auto)
  async function handleSubscribePush() {
    if (!user || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const subscribe = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY || "BJx07W4rWR8uwiVSiC1C2N3Xh1JQCZh1SK8RGWdrYg--SDYK40D16sp0pGkdB02cJeZazhqWIpJmF6Fiyb2K0DE";
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey });
        }
        const raw = sub.toJSON();
        if (raw.endpoint && raw.keys) {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: raw.endpoint, p256dh: raw.keys.p256dh, auth: raw.keys.auth }),
          });
        }
      } catch (e) { /* silent */ }
    };  
    subscribe();
  }

  useEffect(() => {
    const updateBadge = () => {
      fetch("/api/notifications/count")
        .then(r => { if(r.ok) r.json().then(d => {
          setNotifCount(d.count || 0);
          if (typeof navigator !== "undefined" && "setAppBadge" in navigator)
            (navigator as any).setAppBadge(d.count || 0).catch(() => {});
        });}).catch(() => {});
    };
    updateBadge();
    const interval = setInterval(updateBadge, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/notifications/count")
      .then(r => { if(r.ok) r.json().then(d => {
        setNotifCount(d.count || 0);
        if (typeof navigator !== "undefined" && "setAppBadge" in navigator)
          (navigator as any).setAppBadge(d.count || 0).catch(() => {});
      });}).catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login"); router.refresh();
  }

  const isActive = (path: string) => pathname === path;
  const isSettingsPage = pathname === "/admin/settings";
  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/kanban", label: "Kanban", icon: Columns },
    { path: "/history", label: "History", icon: History },
    ...(user?.role === "admin" || user?.role === "su"
      ? [{ path: "/analytics", label: "Analytics", icon: BarChart3 }]
      : []),
  ];

  const initials = (user?.displayName || user?.username || "?").charAt(0).toUpperCase();

  return (
    <div className="h-dvh bg-surface dark:bg-gray-950 flex flex-col overflow-hidden">
      {/* Top Bar - gradient poseidon blue */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#006994] via-[#006994] to-[#0082b3] text-white shadow-[0_2px_8px_rgba(0,105,148,0.12)]">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <span className="text-body-sb tracking-tight select-none">{appConfig.branding.appName}</span>
          </div>

          {/* Right: actions + user */}
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="p-1.5 rounded-full hover:bg-white/15 transition-colors text-white/80 hover:text-white" title={theme === "dark" ? "Light" : "Dark"}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button onClick={() => router.push("/notifications")} className="relative p-1.5 rounded-full hover:bg-white/15 transition-colors text-white/80 hover:text-white">
              <Bell className="w-4 h-4" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent text-[#006994] text-tiny font-[590] min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>

            {/* User pill + menu */}
            <div className="relative flex items-center gap-2 pl-2.5 border-l border-white/15">
              <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-sm font-[590]">
                {initials}
              </div>
              <span className="text-caption text-white/80 hidden sm:inline">{user?.displayName || user?.username}</span>
              <span className={`text-micro px-1.5 py-0.5 rounded-sm hidden sm:inline-block ${
                user?.role === "su" ? "bg-accent/30 text-accent font-[590]" :
                user?.role === "admin" ? "bg-white/15 text-white/90" : "bg-white/10 text-white/60"
              }`}>{user?.role}</span>
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-full hover:bg-white/15 transition-colors text-white/70 hover:text-white" title="Menu">
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-gray-900 border border-border dark:border-gray-700 rounded-lg shadow-elev-dialog z-50 overflow-hidden animate-scale-in origin-top-right divide-y divide-border dark:divide-gray-700/50">
                    {(user?.role === "admin" || user?.role === "su") && (
                      <button onClick={() => { router.push("/admin/users"); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-fg-primary dark:text-gray-200 hover:bg-surface dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors">
                        <Users className="w-4 h-4 text-fg-tertiary dark:text-gray-400" />
                        User Management
                      </button>
                    )}
                    {(user?.role === "su") && (
                      <button onClick={() => { router.push("/admin/settings"); setMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-surface dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors">
                        <Shield className="w-4 h-4" />
                        SU Settings
                      </button>
                    )}
                    <button onClick={() => { router.push("/settings"); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-fg-primary dark:text-gray-200 hover:bg-surface dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors">
                      <Settings className="w-4 h-4 text-fg-tertiary dark:text-gray-400" />
                      Settings
                    </button>
                    {pushPermission === "default" && (
                      <button onClick={() => { handleSubscribePush(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-fg-primary dark:text-gray-200 hover:bg-surface dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors">
                        <Bell className="w-4 h-4 text-fg-tertiary dark:text-gray-400" />
                        Enable Notifications
                      </button>
                    )}
                    <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-surface dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                    <div className="px-4 py-2 text-tiny text-fg-quaternary dark:text-gray-500 font-mono flex items-center justify-between">
                      <span>Media Tracker</span>
                      <span>v{appConfig.branding.version}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-52 bg-white dark:bg-gray-900 border-r border-border dark:border-gray-800 py-3">
          <nav className="flex-1 px-2 space-y-0.5">
            {navItems.map(item => (
              <button key={item.path} onClick={() => router.push(item.path)}
                className={isActive(item.path) ? "sidebar-nav-item sidebar-nav-item-active" : "sidebar-nav-item sidebar-nav-item-inactive"}>
                <item.icon className="w-4 h-4 flex-shrink-0" /><span>{item.label}</span>
              </button>
            ))}
          </nav>
          {/* Desktop add task button */}
          <div className="px-2 pt-3 border-t border-border dark:border-gray-800">
            <button
              onClick={() => router.push("/tasks/new")}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md bg-primary text-white text-sm font-[510] hover:bg-primary-hover transition-all active:scale-[0.97] shadow-elev-accent"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto pb-28 md:pb-0">{children}</main>
      </div>

      {/* Mobile Bottom Nav with FAB cutout */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-border dark:border-gray-800 shadow-[0_-2px_8px_rgba(0,0,0,0.03)]">
        {/* FAB - hidden on admin/settings to avoid accidental navigation */}
        {!isSettingsPage && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-50 bg-white dark:bg-gray-950 rounded-full px-0.5">
            <button onClick={() => router.push("/tasks/new")}
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary-hover text-white shadow-lg flex items-center justify-center transition-all active:scale-90 hover:shadow-xl ring-4 ring-white dark:ring-gray-950 hover:ring-accent/30 duration-200">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Nav items - Dashboard left, Kanban + History right of FAB */}
        <div className="flex items-center h-16 px-1">
          {/* Left group: padded on the right (FAB side) so the edge label clears the notch */}
          <div className="flex-1 flex justify-around pr-4">
            {navItems.slice(0, 2).map(item => (
              <button key={item.path} onClick={() => router.push(item.path)}
                className={['bottom-nav-item transition-all duration-150', isActive(item.path) ? 'bottom-nav-item-active' : 'bottom-nav-item-inactive'].join(' ')}>
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {isActive(item.path) && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
                </div>
                <span className="text-tiny font-[510]">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Spacer for FAB */}
          <div className="w-14 flex-shrink-0" />

          {/* Right group: padded on the left (FAB side) so the edge label clears the notch */}
          <div className="flex-1 flex justify-around pl-4">
            {navItems.slice(2).map(item => (
              <button key={item.path} onClick={() => router.push(item.path)}
                className={['bottom-nav-item transition-all duration-150', isActive(item.path) ? 'bottom-nav-item-active' : 'bottom-nav-item-inactive'].join(' ')}>
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {isActive(item.path) && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
                </div>
                <span className="text-tiny font-[510]">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
