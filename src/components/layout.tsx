"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Columns, History, Users, LogOut, Plus, Sun, Moon, BarChart3, Bell,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

interface User {
  id: number; username: string; displayName: string; role: "su" | "admin" | "staff";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const { theme, toggle } = useTheme();
  const [notifCount, setNotifCount] = useState(0);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) setUser((await res.json()).user);
      else router.push("/login");
    } catch {}
  }, [router]);

  useEffect(() => { fetchUser(); }, [fetchUser, pathname]);

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
  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/kanban", label: "Kanban", icon: Columns },
    { path: "/history", label: "History", icon: History },
    ...(user?.role === "admin" || user?.role === "su"
      ? [{ path: "/analytics", label: "Analytics", icon: BarChart3 }, { path: "/admin/users", label: "Users", icon: Users }]
      : []),
  ];

  const initials = (user?.displayName || user?.username || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-surface dark:bg-gray-950 flex flex-col">
      {/* Top Bar — gradient navy */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#005581] via-[#005581] to-[#006696] text-white shadow-md">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <span className="text-body-sb tracking-tight select-none">Shanuzz Tracker</span>
          </div>

          {/* Right: actions + user */}
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="p-1.5 rounded-full hover:bg-white/15 transition-colors text-white/80 hover:text-white" title={theme === "dark" ? "Light" : "Dark"}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button onClick={() => router.push("/notifications")} className="relative p-1.5 rounded-full hover:bg-white/15 transition-colors text-white/80 hover:text-white">
              <Bell className="w-4 h-4" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent text-[#005581] text-tiny font-[590] min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>

            {/* User pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/15">
              <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-sm font-[590]">
                {initials}
              </div>
              <span className="text-caption text-white/80 hidden sm:inline">{user?.displayName || user?.username}</span>
              <span className={`text-micro px-1.5 py-0.5 rounded-sm hidden sm:inline-block ${
                user?.role === "su" ? "bg-accent/30 text-accent font-[590]" :
                user?.role === "admin" ? "bg-white/15 text-white/90" : "bg-white/10 text-white/60"
              }`}>{user?.role}</span>
              <button onClick={handleLogout} className="p-1.5 rounded-full hover:bg-white/15 transition-colors text-white/70 hover:text-white" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-52 bg-white dark:bg-gray-900 border-r border-border dark:border-gray-800 py-2">
          <nav className="flex-1 px-2 space-y-0.5">
            {navItems.map(item => (
              <button key={item.path} onClick={() => router.push(item.path)}
                className={isActive(item.path) ? "sidebar-nav-item sidebar-nav-item-active" : "sidebar-nav-item sidebar-nav-item-inactive"}>
                <item.icon className="w-4 h-4 flex-shrink-0" /><span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto pb-24 md:pb-0">{children}</main>
      </div>

      {/* Mobile Bottom Nav + FAB */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-border dark:border-gray-800">
        <div className="flex items-center h-16 px-1 relative">
          {/* Left nav items */}
          {navItems.slice(0, 1).map(item => (
            <button key={item.path} onClick={() => router.push(item.path)}
              className={isActive(item.path) ? "bottom-nav-item bottom-nav-item-active" : "bottom-nav-item bottom-nav-item-inactive"}>
              <item.icon className="w-5 h-5" /><span className="text-tiny font-[510]">{item.label}</span>
            </button>
          ))}

          {/* Center FAB — Add Task */}
          <div className="flex-1 flex justify-center">
            <button onClick={() => router.push("/tasks/new")}
              className="w-12 h-12 -mt-6 rounded-full bg-primary hover:bg-primary-hover text-white shadow-lg flex items-center justify-center transition-all active:scale-95 hover:shadow-xl">
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Right nav items */}
          {navItems.slice(1, 4).map(item => (
            <button key={item.path} onClick={() => router.push(item.path)}
              className={isActive(item.path) ? "bottom-nav-item bottom-nav-item-active" : "bottom-nav-item bottom-nav-item-inactive"}>
              <item.icon className="w-5 h-5" /><span className="text-tiny font-[510]">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
