"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout";
import TaskCard from "@/components/task-card";
import SearchBar from "@/components/search-bar";
import { Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export default function HistoryPage() {
  const [tasks, setTasks] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const fetchHistory = useCallback(async () => {
    const params = new URLSearchParams(); params.set("status", "Task Completed"); if (debouncedSearch) params.set("search", debouncedSearch);
    const res = await fetch(`/api/tasks?${params}`);
    if (res.ok) {
      const data = await res.json();
      const cutoff = Date.now() - 24*60*60*1000;
      setTasks(data.tasks.filter((t:any) => t.updatedAt && new Date(t.updatedAt).getTime() < cutoff));
    }
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <h1 className="text-heading-3 text-fg-primary">History</h1>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or Task ID..." />
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-fg-tertiary animate-spin" /></div>
        : tasks.length===0 ? <div className="text-center py-12"><div className="text-3xl mb-3">📦</div><p className="text-body text-fg-secondary">No completed tasks</p><p className="text-caption text-fg-tertiary mt-1">Tasks marked "Task Completed" for 24+ hours appear here</p></div>
        : <div className="space-y-2">{tasks.map((task:any)=><TaskCard key={task.id} task={task}/>)}</div>}
      </div>
    </AppLayout>
  );
}
