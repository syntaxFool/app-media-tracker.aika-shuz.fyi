"use client";

import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
import SearchBar from "@/components/search-bar";
import { useDebounce } from "@/hooks/use-debounce";
import AppLayout from "@/components/layout";
import TaskCard from "@/components/task-card";
import { Loader2, CheckSquare, Download, SlidersHorizontal, ListFilter } from "lucide-react";
import { STATUS_FLOW, ALL_STATUSES } from "@/lib/tasks";
import { useAppConfig } from "@/hooks/use-app-config";

interface Task {
  id: string; customerName: string; shootDate: string; service: string; gender: string;
  isInfluencer: boolean; dueDate: string | null; assignedTo?: string[]; status: string;
  createdBy: string; updatedAt: string | null;
  seriesId?: string | null;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  New: "#72cdf4", "Video Shot": "#ffd200", "Data Copied": "#006994",
  "Video Edited": "#6366f1", Reviewed: "#f59e0b", Approved: "#14b8a6", Uploaded: "#10b981",
  "Task Completed": "#27a644", Dropped: "#9ca3af",
};

export default function DashboardPage() {
  const { config } = useAppConfig();
  const [tasks, setTasks] = useState<Task[]>([]); const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState(""); const [genderFilter, setGenderFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest"); const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [userRole, setUserRole] = useState("staff");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [influencerFilter, setInfluencerFilter] = useState("");
  const [seriesOnlyFilter, setSeriesOnlyFilter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());

  function toggleStatus(status: string) {
    setActiveStatuses(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function clearStatuses() {
    setActiveStatuses(new Set());
  }

  useEffect(() => {
    fetch("/api/auth/me").then(r => { if(r.ok) r.json().then(d => setUserRole(d.user.role)); }).catch(() => {});
  }, []);

  const abortRef = useRef<AbortController | null>(null);

  const fetchTasks = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const params = new URLSearchParams();
    if (influencerFilter) params.set("influencer", influencerFilter);
    if (serviceFilter) params.set("service", serviceFilter);
    if (genderFilter) params.set("gender", genderFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    try {
      const res = await fetch(`/api/tasks?${params}`, { signal: controller.signal });
      if (res.ok) {
        setTasks((await res.json()).tasks);
        setError(null);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("fetchTasks failed:", e);
        setError("Failed to load tasks. Please check your connection.");
      }
    }
    setLoading(false);
  }, [influencerFilter, serviceFilter, genderFilter, debouncedSearch]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const displayTasks = useMemo(() => {
    let result = [...tasks];
    if (myTasksOnly) result = result.filter(t => t.status !== "Task Completed" && t.status !== "Dropped");
    if (seriesOnlyFilter) result = result.filter(t => t.seriesId);
    if (activeStatuses.size > 0) result = result.filter(t => activeStatuses.has(t.status));
    switch (sortBy) {
      case "newest": result.sort((a,b) => new Date(b.shootDate||0).getTime()-new Date(a.shootDate||0).getTime()); break;
      case "oldest": result.sort((a,b) => new Date(a.shootDate||0).getTime()-new Date(b.shootDate||0).getTime()); break;
      case "customer": result.sort((a,b) => a.customerName.localeCompare(b.customerName)); break;
      case "status": result.sort((a,b) => a.status.localeCompare(b.status)); break;
    }
    return result;
  }, [tasks, sortBy, myTasksOnly, seriesOnlyFilter, activeStatuses]);

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
    const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    const rows = displayTasks.map(t => [t.id,t.customerName,t.shootDate?.split("T")[0]||"",t.dueDate?new Date(t.dueDate).toISOString().split("T")[0]:"",t.service,t.gender,t.isInfluencer?"Yes":"No",t.status,Array.isArray(t.assignedTo)?t.assignedTo.join(" / "):""]);
    const csv = [headers.join(","),...rows.map(r => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv],{type:"text/csv"}); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="tasks-export.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-4 pb-16">
        {/* Status Pipeline — 2-row layout, centered, no separators */}
        <div className="space-y-1.5">
          {/* Row 1: New, Video Shot, Data Copied, Video Edited, Reviewed */}
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5">
            {ALL_STATUSES.slice(0, 5).map((status) => {
              const isActive = activeStatuses.has(status);
              const dotColor = STATUS_DOT_COLORS[status] || "#95a5b5";
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  aria-pressed={isActive}
                  className={`px-2.5 py-1 rounded-2xl text-tiny font-[510] whitespace-nowrap flex-shrink-0 border bg-white dark:bg-gray-900 transition-all duration-200 active:scale-[0.97] ${
                    isActive
                      ? "shadow-sm"
                      : "border-border dark:border-gray-700 text-fg-tertiary hover:text-fg-primary hover:border-fg-tertiary/50 hover:shadow-sm"
                  }`}
                  style={isActive ? { color: dotColor, borderColor: dotColor } : undefined}
                >
                  {status}
                </button>
              );
            })}
          </div>
          {/* Row 2: Approved, Uploaded, Task Completed, Dropped */}
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5">
            {ALL_STATUSES.slice(5).map((status) => {
              const isActive = activeStatuses.has(status);
              const dotColor = STATUS_DOT_COLORS[status] || "#95a5b5";
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  aria-pressed={isActive}
                  className={`px-2.5 py-1 rounded-2xl text-tiny font-[510] whitespace-nowrap flex-shrink-0 border bg-white dark:bg-gray-900 transition-all duration-200 active:scale-[0.97] ${
                    isActive
                      ? "shadow-sm"
                      : "border-border dark:border-gray-700 text-fg-tertiary hover:text-fg-primary hover:border-fg-tertiary/50 hover:shadow-sm"
                  }`}
                  style={isActive ? { color: dotColor, borderColor: dotColor } : undefined}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by name, note, series, or Task ID..."
        />

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
          <div className="flex items-center gap-2 overflow-x-auto pb-2 animate-fade-in p-3 bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md shadow-elev-subtle">
            <button onClick={() => setInfluencerFilter(influencerFilter === "true" ? "" : "true")}
              className={`flex items-center gap-1.5 text-label px-2.5 py-1.5 rounded-md border transition-all flex-shrink-0 ${
                influencerFilter === "true" ? "bg-accent/10 text-accent border-accent/30" : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700"
              }`}><StarIcon filled={influencerFilter === "true"}/>Influencer</button>
            <button onClick={() => setSeriesOnlyFilter(!seriesOnlyFilter)}
              className={`flex items-center gap-1.5 text-label px-2.5 py-1.5 rounded-md border transition-all flex-shrink-0 ${
                seriesOnlyFilter ? "bg-primary/10 text-primary border-primary/30" : "bg-white dark:bg-gray-800 text-fg-tertiary border-border dark:border-gray-700"
              }`}>📹 Series</button>
            <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
              className="select-linear text-label py-1.5 flex-shrink-0 bg-white dark:bg-gray-800">
              <option value="">All Services</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
              className="select-linear text-label py-1.5 flex-shrink-0 bg-white dark:bg-gray-800">
              <option value="">All Genders</option>
              {config.genders.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <button onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-label px-2.5 py-1.5 rounded-md border border-border dark:border-gray-700 bg-white dark:bg-gray-800 text-fg-tertiary hover:bg-surface transition-all flex-shrink-0">
              <Download className="w-3.5 h-3.5"/>CSV</button>
          </div>
        )}

        {/* Selected-Status Banner — reflects the active filter(s) and their count */}
        {(() => {
          const selectedList = Array.from(activeStatuses);
          const count = displayTasks.length;
          const singleColor = selectedList.length === 1
            ? (STATUS_DOT_COLORS[selectedList[0]] || "#95a5b5")
            : null;
          const gradientBorder = selectedList.length > 1
            ? `linear-gradient(90deg, ${selectedList.map(s => STATUS_DOT_COLORS[s] || "#95a5b5").join(", ")})`
            : null;
          return (
            <div
              className={`rounded-md px-3.5 py-2.5 flex items-center justify-between bg-white dark:bg-gray-900 border-2 transition-colors ${
                selectedList.length === 0 ? "border-border dark:border-gray-800" : ""
              }`}
              style={
                singleColor
                  ? { borderColor: singleColor }
                  : gradientBorder
                    ? { borderImage: `${gradientBorder} 1`, borderColor: "transparent" }
                    : undefined
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                {selectedList.length > 0 && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {selectedList.map(s => (
                      <span
                        key={s}
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_DOT_COLORS[s] || "#95a5b5" }}
                      />
                    ))}
                  </div>
                )}
                {selectedList.length === 0 ? (
                  <span className="text-label text-fg-quaternary">All tasks</span>
                ) : selectedList.length === 1 ? (
                  <>
                    <span className="text-label text-fg-quaternary">Showing</span>
                    <span className="text-label font-[590] text-fg-primary dark:text-gray-100 truncate">
                      {selectedList[0]}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-label text-fg-quaternary">Showing</span>
                    <span className="text-label font-[590] text-fg-primary dark:text-gray-100">
                      {selectedList.length} statuses
                    </span>
                    <span className="text-label text-fg-quaternary hidden sm:inline truncate">
                      ({selectedList.join(", ")})
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-label font-[590] text-fg-primary dark:text-gray-100">
                  {count} {count === 1 ? "task" : "tasks"}
                </span>
                {selectedList.length > 0 && (
                  <button
                    type="button"
                    onClick={clearStatuses}
                    className="text-label text-fg-quaternary hover:text-fg-tertiary transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {error && (
          <div className="bg-danger/10 text-danger border border-danger/20 rounded-md px-3 py-2 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Task List */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-fg-tertiary animate-spin"/></div>
        ) : displayTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p className="empty-state-title">
              {searchInput
                ? `No tasks matching "${searchInput}"`
                : activeStatuses.size > 0
                  ? activeStatuses.size === 1
                    ? `No "${Array.from(activeStatuses)[0]}" tasks`
                    : `No tasks in selected statuses`
                  : "No tasks found"}
            </p>
            <p className="empty-state-desc">
              {searchInput
                ? "Try a different search term or clear the search"
                : activeStatuses.size > 0
                  ? 'Tap “Clear” above to remove the filter'
                  : "Tap the + button to create your first task"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTasks.map((task, i) => (
              <div key={task.id} className="stagger-item" style={{animationDelay: `${Math.min(i * 30, 360)}ms`}}>
                <TaskCard task={task} selectMode={selectMode} selected={selectedIds.has(task.id)} onToggleSelect={() => toggleSelect(task.id)}/>
              </div>
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
