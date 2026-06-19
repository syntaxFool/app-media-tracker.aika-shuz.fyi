"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { STATUS_FLOW } from "@/lib/tasks";

const STATUSES = ["New", "Video Shot", "Data Copied", "Video Edited", "Reviewed", "Uploaded", "Task Completed"];
const COLORS: Record<string, string> = {
  New: "border-l-ocean",
  "Video Shot": "border-l-accent",
  "Data Copied": "border-l-primary",
  "Video Edited": "border-l-indigo-500",
  Reviewed: "border-l-orange-500",
  Uploaded: "border-l-emerald-500",
  "Task Completed": "border-l-green-500",
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
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTasks();
  }

  const columns = STATUSES.map((status) => ({
    status,
    tasks: tasks.filter((t) => t.status === status),
  }));

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-fg-tertiary animate-spin"/></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-heading-3 text-fg-primary dark:text-gray-100">Kanban Board</h1>
          <button onClick={fetchTasks} className="btn-ghost text-label">Refresh</button>
        </div>

        {/* Horizontal scroll on mobile, flex on desktop */}
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
          {columns.map((col) => (
            <div key={col.status} className="flex-shrink-0 w-72 snap-start flex flex-col bg-surface dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md">
              {/* Column Header */}
              <div className={`px-3 py-2.5 border-b border-border dark:border-gray-800 border-l-4 ${COLORS[col.status] || "border-l-ocean"} rounded-t-md`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-[590] text-fg-primary dark:text-gray-200">{col.status}</span>
                  <span className="text-micro text-fg-quaternary dark:text-gray-500 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-pill border border-border dark:border-gray-700">
                    {col.tasks.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 min-h-[200px]">
                {col.tasks.length === 0 && (
                  <p className="text-micro text-fg-quaternary dark:text-gray-600 text-center py-6">No tasks</p>
                )}
                {col.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-sm p-3 shadow-sm cursor-pointer hover:shadow-elev-raised transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-caption font-[510] text-fg-primary dark:text-gray-100 truncate flex-1">
                        {task.customerName}
                      </span>
                      {task.isInfluencer && <Star className="w-3 h-3 text-accent flex-shrink-0" fill="currentColor"/>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-tiny text-fg-quaternary font-mono">{task.id}</span>
                      <span className="text-tiny text-fg-quaternary">{task.service}</span>
                    </div>
                    {/* Quick move buttons — valid transitions only */}
                    {(() => {
                      const allowed = (STATUS_FLOW[task.status] || []).slice(0, 3);
                      if (allowed.length === 0) return null;
                      return (
                        <div className="flex gap-1 mt-2 pt-2 border-t border-border dark:border-gray-700">
                          {allowed.map((s) => (
                            <button
                              key={s}
                              onClick={(e) => { e.stopPropagation(); moveTask(task.id, s); }}
                              className="text-tiny px-2 py-0.5 rounded-sm bg-surface dark:bg-gray-900 text-fg-tertiary dark:text-gray-400 hover:bg-primary/10 hover:text-primary transition-colors"
                            >→ {s}</button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
