"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout";
import { useRouter } from "next/navigation";
import { Loader2, Star, Clock, Users } from "lucide-react";
import { STATUS_FLOW, ALL_STATUSES } from "@/lib/tasks";

const COLUMN_COLORS: Record<string, string> = {
  New: "border-l-ocean bg-ocean/[0.03]",
  "Video Shot": "border-l-accent bg-accent/[0.03]",
  "Data Copied": "border-l-primary bg-primary/[0.03]",
  "Video Edited": "border-l-indigo-500 bg-indigo-500/[0.03]",
  Reviewed: "border-l-orange-500 bg-orange-500/[0.03]",
  Uploaded: "border-l-emerald-500 bg-emerald-500/[0.03]",
  "Task Completed": "border-l-green-500 bg-green-500/[0.03]",
};

const COLUMN_DOT: Record<string, string> = {
  New: "bg-ocean",
  "Video Shot": "bg-accent",
  "Data Copied": "bg-primary",
  "Video Edited": "bg-indigo-500",
  Reviewed: "bg-orange-500",
  Uploaded: "bg-emerald-500",
  "Task Completed": "bg-green-500",
};

export default function KanbanPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks.filter((t: any) => t.status !== "Task Completed" ||
        (t.updatedAt && new Date(t.updatedAt).getTime() > Date.now() - 24*60*60*1000)));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function moveTask(taskId: string, newStatus: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  const columns = ALL_STATUSES.map((status) => {
    const colTasks = tasks.filter((t) => t.status === status);
    const overdueCount = colTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length;
    return { status, tasks: colTasks, count: colTasks.length, overdueCount };
  });

  if (loading) return (
    <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-fg-tertiary animate-spin"/></div></AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h1 className="text-heading-3 text-fg-primary dark:text-gray-100">Kanban Board</h1>
          <div className="flex items-center gap-2">
            <span className="text-caption text-fg-quaternary">{tasks.length} tasks</span>
            <button onClick={fetchTasks} className="btn-pill text-label">Refresh</button>
          </div>
        </div>

        {/* Horizontal scroll with snap on mobile, flex on desktop */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full min-h-[60vh] pb-2 snap-x snap-mandatory md:snap-none">
            {columns.map((col) => (
              <div
                key={col.status}
                className={`flex-shrink-0 w-72 snap-center flex flex-col rounded-lg border border-border dark:border-gray-800 ${COLUMN_COLORS[col.status] || ""}`}
              >
                {/* Column Header */}
                <div className={`px-3 py-2.5 border-b border-border dark:border-gray-800 border-l-4 ${COLUMN_COLORS[col.status]?.split(" ")[0] || "border-l-ocean"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${COLUMN_DOT[col.status] || "bg-ocean"}`}/>
                      <span className="text-sm font-[590] text-fg-primary dark:text-gray-200">{col.status}</span>
                    </div>
                    <span className={`text-micro font-[590] px-2 py-0.5 rounded-pill border ${
                      col.overdueCount > 0
                        ? "bg-danger/10 text-danger border-danger/20"
                        : "bg-white dark:bg-gray-800 text-fg-quaternary dark:text-gray-400 border-border dark:border-gray-700"
                    }`}>
                      {col.count}
                      {col.overdueCount > 0 && <span className="ml-1 text-tiny">⚠{col.overdueCount}</span>}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {col.tasks.length === 0 && (
                    <p className="text-micro text-fg-quaternary dark:text-gray-600 text-center py-8">—</p>
                  )}
                  {col.tasks.map((task) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                    const assigned = Array.isArray(task.assignedTo) ? task.assignedTo : [];

                    return (
                      <div
                        key={task.id}
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-md p-3 shadow-sm cursor-pointer hover:shadow-elev-raised hover:border-primary/20 transition-all group"
                      >
                        {/* Top row: name + influencer */}
                        <div className="flex items-start gap-2 mb-1.5">
                          <span className="text-sm font-[510] text-fg-primary dark:text-gray-100 truncate flex-1 leading-snug">
                            {task.customerName}
                          </span>
                          {task.isInfluencer && (
                            <Star className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" fill="currentColor"/>
                          )}
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                          <span className="text-tiny text-fg-quaternary dark:text-gray-500 font-mono">{task.id}</span>
                          <span className="text-tiny text-fg-quaternary dark:text-gray-500">{task.service}</span>
                        </div>

                        {/* Due date indicator */}
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 text-tiny mb-1.5 ${
                            isOverdue ? "text-danger" : "text-fg-quaternary dark:text-gray-500"
                          }`}>
                            <Clock className="w-3 h-3"/>
                            <span>{new Date(task.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}</span>
                            {isOverdue && <span className="font-[590]">Overdue</span>}
                          </div>
                        )}

                        {/* Assigned staff */}
                        {assigned.length > 0 && (
                          <div className="flex items-center gap-1 text-tiny text-fg-quaternary dark:text-gray-500 mb-1.5">
                            <Users className="w-3 h-3"/>
                            <span className="truncate">{assigned.slice(0, 3).join(", ")}{assigned.length > 3 ? ` +${assigned.length - 3}` : ""}</span>
                          </div>
                        )}

                        {/* Quick move buttons */}
                        {(() => {
                          const allowed = (STATUS_FLOW[task.status] || []).slice(0, 3);
                          if (allowed.length === 0) return null;
                          return (
                            <div className="flex gap-1 pt-2 border-t border-border dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                              {allowed.map((s) => (
                                <button
                                  key={s}
                                  onClick={(e) => { e.stopPropagation(); moveTask(task.id, s); }}
                                  className="text-tiny px-2 py-0.5 rounded-sm bg-surface dark:bg-gray-900 text-fg-tertiary dark:text-gray-400 hover:bg-primary hover:text-white transition-colors"
                                >→ {s}</button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
