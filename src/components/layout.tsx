"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  History,
  Users,
  LogOut,
  Plus,
  Menu,
  X,
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
  const [menuOpen, setMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(!menuOpen)} className="btn-icon p-1.5 md:hidden">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-small font-[590] text-fg-primary">Shanuzz Tracker</span>
          </div>

          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <button
                onClick={() => router.push("/tasks/new")}
                className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-label"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Task</span>
              </button>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
              <span className="text-caption text-fg-tertiary hidden sm:block">{user?.username}</span>
              <span className={`
                text-micro px-1.5 py-0.5 rounded-sm
                ${user?.role === "admin" ? "bg-primary/10 text-primary" : "bg-white/[0.04] text-fg-tertiary"}
              `}>
                {user?.role}
              </span>
              <button onClick={handleLogout} className="btn-subtle p-1.5">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-white/[0.08] animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 pt-16 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { router.push(item.path); setMenuOpen(false); }}
                  className={`sidebar-nav-item w-full ${isActive(item.path) ? "sidebar-nav-item-active" : "sidebar-nav-item-inactive"}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="flex flex-1">
        <aside className="hidden md:block w-56 border-r border-white/[0.05] p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`sidebar-nav-item w-full ${isActive(item.path) ? "sidebar-nav-item-active" : "sidebar-nav-item-inactive"}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface/90 backdrop-blur-xl border-t border-white/[0.08]">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full ${
                isActive(item.path) ? "text-primary" : "text-fg-tertiary"
              }`}
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
