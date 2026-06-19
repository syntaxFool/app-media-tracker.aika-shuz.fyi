"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout";
import TaskCard from "@/components/task-card";
import FilterBar from "@/components/filter-bar";
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

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [influencerFilter, setInfluencerFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (influencerFilter) params.set("influencer", influencerFilter);
    if (serviceFilter) params.set("service", serviceFilter);
    if (genderFilter) params.set("gender", genderFilter);

    const res = await fetch(`/api/tasks?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
    }
    setLoading(false);
  }, [influencerFilter, serviceFilter, genderFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const services = Array.from(new Set(tasks.map((t) => t.service))).sort();
  const statusCounts: Record<string, number> = {};
  tasks.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Stats Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex-shrink-0 bg-white border border-border rounded-sm px-3 py-2 shadow-sm">
              <span className="text-micro text-fg-quaternary block">{status}</span>
              <span className="text-body font-[510] text-fg-primary">{count}</span>
            </div>
          ))}
        </div>

        <FilterBar
          influencerFilter={influencerFilter}
          serviceFilter={serviceFilter}
          genderFilter={genderFilter}
          services={services}
          onInfluencerChange={setInfluencerFilter}
          onServiceChange={setServiceFilter}
          onGenderChange={setGenderFilter}
        />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-fg-tertiary animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">🎬</div>
            <p className="text-body text-fg-secondary">No tasks found</p>
            <p className="text-caption text-fg-tertiary mt-1">Create a new task to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
