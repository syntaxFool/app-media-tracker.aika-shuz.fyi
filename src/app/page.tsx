"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AppLayout from "@/components/layout";
import TaskCard from "@/components/task-card";
import FilterBar from "@/components/filter-bar";
import { Loader2, ArrowUpDown, CheckSquare, Download } from "lucide-react";
import { STATUS_FLOW, ALL_STATUSES } from "@/lib/tasks";

interface Task {
  id: string;
  customerName: string;
  shootDate: string;
  service: string;
  gender: string;
  isInfluencer: boolean;
  dueDate: string | null;
  status: string;
  createdBy: string;
  updatedAt: string | null;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [influencerFilter, setInfluencerFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [userRole, setUserRole] = useState("staff");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Fetch user role
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if(r.ok) r.json().then((d) => setUserRole(d.user.role)); })
      .catch(() => {});
  }, []);

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

  // Sort + filter
  const displayTasks = useMemo(() => {
    let result = [...tasks];

    // My Tasks filter
    if (myTasksOnly) {
      const roleStatusMap: Record<string, string[]> = {
        admin: [], // admin sees all
        staff: ["New", "Video Shot", "Data Copied", "Video Edited", "Reviewed", "Uploaded"],
        // Default: show all active
      };
      const allowed = roleStatusMap[userRole];
      if (allowed && allowed.length > 0) {
        // Show tasks where status is in the staff's pipeline
        result = result.filter((t) => t.status !== "Task Completed");
      }
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.shootDate || 0).getTime() - new Date(a.shootDate || 0).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.shootDate || 0).getTime() - new Date(b.shootDate || 0).getTime());
        break;
      case "customer":
        result.sort((a, b) => a.customerName.localeCompare(b.customerName));
        break;
      case "status":
        result.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "date":
        result.sort((a, b) => new Date(a.shootDate).getTime() - new Date(b.shootDate).getTime());
        break;
    }

    return result;
  }, [tasks, sortBy, myTasksOnly, userRole]);

  const services = Array.from(new Set(tasks.map((t) => t.service))).sort();
  const statusCounts: Record<string, number> = {};
  tasks.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });

  // Bulk update
  async function handleBulkAdvance() {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    for (const id of Array.from(selectedIds)) {
      const task = tasks.find((t) => t.id === id);
      if (!task) continue;
      const nextMap: Record<string, string> = {};
      for (const [k, v] of Object.entries(STATUS_FLOW)) {
        if (v.length > 0) nextMap[k] = v[0];
      }
      const next = nextMap[task.status];
      if (next) {
        await fetch(`/api/tasks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
      }
    }
    setBulkUpdating(false);
    setSelectedIds(new Set());
    setSelectMode(false);
    fetchTasks();
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  }

  // CSV Export
  function handleExportCSV() {
    const headers = ["ID", "Customer", "Shoot Date", "Service", "Gender", "Influencer", "Status", "Note"];
    const rows = displayTasks.map((t) => [
      t.id, t.customerName, t.shootDate?.split("T")[0] || "", t.service, t.gender,
      t.isInfluencer ? "Yes" : "No", t.status, "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tasks-export.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Stats + Toolbar Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="select-linear text-label py-1.5 flex-shrink-0 text-fg-primary dark:text-gray-200 dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="customer">Customer A-Z</option>
            <option value="status">Status</option>
            <option value="date">Shoot Date</option>
          </select>

          {/* My Tasks toggle */}
          <button
            onClick={() => setMyTasksOnly(!myTasksOnly)}
            className={`text-label font-[510] px-2.5 py-1.5 rounded-sm border transition-colors flex-shrink-0 ${
              myTasksOnly
                ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary"
                : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700"
            }`}
          >
            My Tasks
          </button>

          {/* Bulk select toggle */}
          <button
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
            className={`text-label font-[510] px-2.5 py-1.5 rounded-sm border transition-colors flex-shrink-0 ${
              selectMode
                ? "bg-accent/20 text-fg-primary border-accent dark:text-gray-200"
                : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 inline mr-1" />
            Select
          </button>

          {/* Export CSV */}
          <button onClick={handleExportCSV} className="text-label font-[510] px-2.5 py-1.5 rounded-sm border border-border dark:border-gray-700 bg-white dark:bg-gray-800 text-fg-tertiary hover:bg-surface transition-colors flex-shrink-0">
            <Download className="w-3.5 h-3.5 inline mr-1" />CSV
          </button>

          {/* Bulk Advance */}
          {selectMode && selectedIds.size > 0 && (
            <button onClick={handleBulkAdvance} disabled={bulkUpdating} className="btn-primary text-label py-1.5 flex-shrink-0">
              {bulkUpdating ? "Moving..." : `Advance ${selectedIds.size} →`}
            </button>
          )}
        </div>

        {/* Status counts */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex-shrink-0 bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-sm px-3 py-2 shadow-sm">
              <span className="text-micro text-fg-quaternary dark:text-gray-500 block">{status}</span>
              <span className="text-body font-[510] text-fg-primary dark:text-gray-100">{count}</span>
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
        ) : displayTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">🎬</div>
            <p className="text-body text-fg-secondary dark:text-gray-300">No tasks found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                selectMode={selectMode}
                selected={selectedIds.has(task.id)}
                onToggleSelect={() => toggleSelect(task.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
