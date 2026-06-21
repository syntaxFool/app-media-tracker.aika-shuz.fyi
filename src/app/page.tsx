"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AppLayout from "@/components/layout";
import TaskCard from "@/components/task-card";
import { Loader2, CheckSquare, Download, SlidersHorizontal, ListFilter } from "lucide-react";
import { STATUS_FLOW, ALL_STATUSES } from "@/lib/tasks";

interface Task {
  id: string; customerName: string; shootDate: string; service: string; gender: string;
  isInfluencer: boolean; dueDate: string | null; assignedTo?: string[]; status: string;
  createdBy: string; updatedAt: string | null;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  New: "#72cdf4", "Video Shot": "#ffd200", "Data Copied": "#005581",
  "Video Edited": "#6366f1", Reviewed: "#f59e0b", Uploaded: "#10b981",
  "Task Completed": "#27a644", Dropped: "#9ca3af",
};

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]); const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState(""); const [genderFilter, setGenderFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest"); const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [userRole, setUserRole] = useState("staff");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [influencerFilter, setInfluencerFilter] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => { if(r.ok) r.json().then(d => setUserRole(d.user.role)); }).catch(() => {});
  }, []);

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (influencerFilter) params.set("influencer", influencerFilter);
    if (serviceFilter) params.set("service", serviceFilter);
    if (genderFilter) params.set("gender", genderFilter);
    const res = await fetch(`/api/tasks?${params}`);
    if (res.ok) setTasks((await res.json()).tasks);
    setLoading(false);
  }, [influencerFilter, serviceFilter, genderFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const displayTasks = useMemo(() => {
    let result = [...tasks];
    if (myTasksOnly) result = result.filter(t => t.status !== "Task Completed" && t.status !== "Dropped");
    switch (sortBy) {
      case "newest": result.sort((a,b) => new Date(b.shootDate||0).getTime()-new Date(a.shootDate||0).getTime()); break;
      case "oldest": result.sort((a,b) => new Date(a.shootDate||0).getTime()-new Date(b.shootDate||0).getTime()); break;
      case "customer": result.sort((a,b) => a.customerName.localeCompare(b.customerName)); break;
      case "status": result.sort((a,b) => a.status.localeCompare(b.status)); break;
    }
    return result;
  }, [tasks, sortBy, myTasksOnly]);

  const services = Array.from(new Set(tasks.map(t => t.service))).sort();
  const statusCounts: Record<string, number> = {};
  tasks.forEach(t => { statusCounts[t.status] = (statusCounts[t.status]||0)+1; });

  async function handleBulkAdvance() {
    if (selectedIds.size === 0) return; setBulkUpdating(true);
    const nextMap: Record<string,string> = {};
    for (const [k,v] of Object.entries(STATUS_FLOW)) { if(v.length>0) nextMap[k]=v[0]; }
    for (const id of Array.from(selectedIds)) {
      const task = tasks.find(t => t.id === id); if (!task) continue;
      const next = nextMap[task.status];
      if (next) await fetch(`/api/tasks/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status:next}) });
    }
    setBulkUpdating(false); setSelectedIds(new Set()); setSelectMode(false); fetchTasks();
  }

  function toggleSelect(id: string) { const next = new Set(selectedIds); next.has(id) ? next.delete(id) : next.add(id); setSelectedIds(next); }

  function handleExportCSV() {
    const headers = ["ID","Customer","Shoot Date","Due Date","Service","Gender","Influencer","Status","Assigned"];
    const rows = displayTasks.map(t => [t.id,t.customerName,t.shootDate?.split("T")[0]||"",t.dueDate?new Date(t.dueDate).toISOString().split("T")[0]:"",t.service,t.gender,t.isInfluencer?"Yes":"No",t.status,Array.isArray(t.assignedTo)?t.assignedTo.join(" / "):""]);
    const csv = [headers.join(","),...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv],{type:"text/csv"}); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="tasks-export.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-4 pb-16">
        {/* Stats Bar — with colored dots */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex-shrink-0 bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md px-3 py-2 shadow-sm flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: STATUS_DOT_COLORS[status] || "#95a5b5"}}/>
              <div>
                <span className="text-micro text-fg-quaternary dark:text-gray-500 block leading-tight">{status}</span>
                <span className="text-body font-[590] text-fg-primary dark:text-gray-100 leading-tight">{count}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Unified Action Bar — single scrollable row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="select-linear text-label py-1.5 flex-shrink-0 bg-white dark:bg-gray-800">
            <option value="newest">Newest</option><option value="oldest">Oldest</option>
            <option value="customer">Customer</option><option value="status">Status</option>
          </select>

          <button onClick={() => setMyTasksOnly(!myTasksOnly)}
            className={`text-label font-[510] px-2.5 py-1.5 rounded-md border transition-all flex-shrink-0 ${
              myTasksOnly ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary" : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700"
            }`}><ListFilter className="w-3.5 h-3.5 inline-block align-[-0.125em] mr-1"/>{myTasksOnly ? "Active" : "All"}
          </button>

          <button onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
            className={`text-label font-[510] px-2.5 py-1.5 rounded-md border transition-all flex-shrink-0 ${
              selectMode ? "bg-accent/20 text-fg-primary border-accent dark:text-gray-200" : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700"
            }`}><CheckSquare className="w-3.5 h-3.5 inline-block align-[-0.125em] mr-1"/>{selectMode ? `✓ ${selectedIds.size}` : "Select"}
          </button>

          <button onClick={() => setShowFilters(!showFilters)}
            className={`text-label font-[510] px-2.5 py-1.5 rounded-md border transition-all flex-shrink-0 ${
              showFilters ? "bg-primary/10 text-primary border-primary/30" : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700"
            }`}><SlidersHorizontal className="w-3.5 h-3.5 inline mr-1"/>Filters</button>

          {selectMode && selectedIds.size > 0 && (
            <button onClick={handleBulkAdvance} disabled={bulkUpdating}
              className="btn-primary text-label py-1.5 flex-shrink-0">{bulkUpdating ? "Moving..." : `Advance ${selectedIds.size} →`}</button>
          )}
        </div>

        {/* Expandable Filter Bar — includes CSV */}
        {showFilters && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 animate-fade-in">
            <button onClick={() => setInfluencerFilter(influencerFilter === "true" ? "" : "true")}
              className={`flex items-center gap-1.5 text-label px-2.5 py-1.5 rounded-md border transition-all flex-shrink-0 ${
                influencerFilter === "true" ? "bg-accent/10 text-accent border-accent/30" : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700"
              }`}><StarIcon filled={influencerFilter === "true"}/>Influencer</button>
            <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
              className="select-linear text-label py-1.5 flex-shrink-0 bg-white dark:bg-gray-800">
              <option value="">All Services</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
              className="select-linear text-label py-1.5 flex-shrink-0 bg-white dark:bg-gray-800">
              <option value="">All Genders</option>
              <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
            </select>
            <button onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-label px-2.5 py-1.5 rounded-md border border-border dark:border-gray-700 bg-white dark:bg-gray-800 text-fg-tertiary hover:bg-surface transition-all flex-shrink-0">
              <Download className="w-3.5 h-3.5"/>CSV</button>
          </div>
        )}

        {/* Task List */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-fg-tertiary animate-spin"/></div>
        ) : displayTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4 opacity-40">📋</div>
            <p className="text-body text-fg-secondary dark:text-gray-300">No tasks found</p>
            <p className="text-caption text-fg-tertiary mt-1">Tap the + button to create your first task</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTasks.map(task => (
              <TaskCard key={task.id} task={task} selectMode={selectMode} selected={selectedIds.has(task.id)} onToggleSelect={() => toggleSelect(task.id)}/>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}
