"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout";
import TaskCard from "@/components/task-card";
import SearchBar from "@/components/search-bar";
import { Loader2 } from "lucide-react";

interface Task {
  id: string;
  customerName: string;
  shootDate: string;
  service: string;
  gender: string;
  isInfluencer: boolean;
  status: string;
  createdBy: string;
}

export default function HistoryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchHistory = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("status", "Task Completed");
    if (search) params.set("search", search);

    const res = await fetch(`/api/tasks?${params}`);
    if (res.ok) {
      const data = await res.json();
      // Filter: only show tasks completed more than 24h ago
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const history = data.tasks.filter((t: any) => {
        return t.updatedAt && new Date(t.updatedAt).getTime() < cutoff;
      });
      setTasks(history);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <h1 className="text-heading-3 text-fg-primary">History</h1>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by Customer Name or Task ID..."
        />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-fg-tertiary animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">📦</div>
            <p className="text-body text-fg-secondary">No completed tasks in archive</p>
            <p className="text-caption text-fg-tertiary mt-1">
              Tasks marked as &ldquo;Task Completed&rdquo; for more than 24 hours appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}

        {!loading && tasks.length > 0 && (
          <p className="text-center text-micro text-fg-quaternary">
            {tasks.length} archived task{tasks.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </AppLayout>
  );
}
