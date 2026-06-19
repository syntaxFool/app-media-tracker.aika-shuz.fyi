"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  History,
  Users,
  LogOut,
  Plus,
} from "lucide-react";

interface User {
  id: number;
  username: string;
  role: "admin" | "staff";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.push("/login");
      }
    } catch {
      // ignore
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/history", label: "History", icon: History },
    ...(user?.role === "admin"
      ? [{ path: "/admin/users", label: "Users", icon: Users }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-primary text-white">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <span className="text-body-sb tracking-tight">Shanuzz Tracker</span>
          </div>

          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <button
                onClick={() => router.push("/tasks/new")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-label font-[510] rounded-sm bg-white/15 hover:bg-white/25 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Task</span>
              </button>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-white/15">
              <span className="text-caption text-white/70 hidden sm:inline">
                {user?.username}
              </span>
              <span className="text-micro px-1.5 py-0.5 rounded-sm bg-white/15 text-white/90">
                {user?.role}
              </span>
              <button onClick={handleLogout} className="p-1.5 rounded-sm hover:bg-white/15 transition-colors text-white/70 hover:text-white" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-52 bg-white border-r border-border py-2">
          <nav className="flex-1 px-2 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={
                  isActive(item.path)
                    ? "sidebar-nav-item sidebar-nav-item-active"
                    : "sidebar-nav-item sidebar-nav-item-inactive"
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={
                isActive(item.path)
                  ? "bottom-nav-item bottom-nav-item-active"
                  : "bottom-nav-item bottom-nav-item-inactive"
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-tiny font-[510]">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
