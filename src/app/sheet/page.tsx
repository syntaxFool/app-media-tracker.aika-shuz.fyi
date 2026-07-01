"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout";
import SearchBar from "@/components/search-bar";
import StatusBadge from "@/components/status-badge";
import { useAppConfig } from "@/hooks/use-app-config";
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Download, Users, 
  Star, RefreshCw, Layers, CheckCircle2, AlertCircle, ExternalLink 
} from "lucide-react";

interface Task {
  id: string;
  customerName: string;
  shootDate: string;
  dueDate: string | null;
  service: string;
  gender: string;
  isInfluencer: boolean;
  note: string | null;
  status: string;
  assignedTo?: string[];
  seriesId?: string | null;
  partNumber?: number | null;
  seriesTotal?: number;
  createdAt: string;
  updatedAt: string | null;
}

type SortField = "id" | "customerName" | "shootDate" | "dueDate" | "service" | "gender" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

export default function SheetPage() {
  const router = useRouter();
  const { config: appConfig } = useAppConfig();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [influencerFilter, setInfluencerFilter] = useState("all");

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Fetch all tasks
  const fetchAllTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Query with status=all to bypass active-only filtering
      const res = await fetch("/api/tasks?status=all");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      } else {
        setError("Failed to load tasks database. Please try again.");
      }
    } catch (err) {
      console.error("fetchAllTasks error:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  // Handle column header clicks for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Render sorting arrows
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-fg-quaternary dark:text-gray-500 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary dark:text-[#72cdf4]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary dark:text-[#72cdf4]" />
    );
  };

  // Client-side filtering & search
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Status Filter
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      
      // 2. Service Filter
      if (serviceFilter !== "all" && task.service !== serviceFilter) return false;

      // 3. Gender Filter
      if (genderFilter !== "all" && task.gender !== genderFilter) return false;

      // 4. Influencer Filter
      if (influencerFilter !== "all") {
        const wantsInfluencer = influencerFilter === "true";
        if (task.isInfluencer !== wantsInfluencer) return false;
      }

      // 5. Text Search (Universal query across multiple fields)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const assignedNames = Array.isArray(task.assignedTo) ? task.assignedTo.join(" ") : "";
        const shootDateStr = new Date(task.shootDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
        
        return (
          task.id.toLowerCase().includes(query) ||
          task.customerName.toLowerCase().includes(query) ||
          task.service.toLowerCase().includes(query) ||
          task.gender.toLowerCase().includes(query) ||
          task.status.toLowerCase().includes(query) ||
          (task.note || "").toLowerCase().includes(query) ||
          (task.seriesId || "").toLowerCase().includes(query) ||
          assignedNames.toLowerCase().includes(query) ||
          shootDateStr.toLowerCase().includes(query) ||
          dueDateStr.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter, serviceFilter, genderFilter, influencerFilter]);

  // Sort filtered tasks
  const sortedTasks = useMemo(() => {
    const result = [...filteredTasks];
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle null or undefined
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      // Handle date fields
      if (sortField === "shootDate" || sortField === "dueDate" || sortField === "createdAt") {
        const aTime = aVal ? new Date(aVal).getTime() : 0;
        const bTime = bVal ? new Date(bVal).getTime() : 0;
        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
      }

      // Standard alphabetical or boolean comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
      if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [filteredTasks, sortField, sortDirection]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = sortedTasks.length;
    const completed = sortedTasks.filter(t => t.status === "Task Completed").length;
    const active = sortedTasks.filter(t => t.status !== "Task Completed" && t.status !== "Dropped").length;
    const influencer = sortedTasks.filter(t => t.isInfluencer).length;
    return { total, completed, active, influencer };
  }, [sortedTasks]);

  // Get dynamic unique services and statuses from raw tasks for the dropdowns
  const uniqueServices = useMemo(() => {
    const services = tasks.map(t => t.service);
    return Array.from(new Set(services)).sort();
  }, [tasks]);

  const uniqueStatuses = useMemo(() => {
    const statuses = tasks.map(t => t.status);
    return Array.from(new Set(statuses)).sort();
  }, [tasks]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Customer", "Shoot Date", "Due Date", "Service", "Gender", "Influencer", "Status", "Assigned", "Note", "Series ID", "Part #"];
    const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    
    const rows = sortedTasks.map(t => [
      t.id,
      t.customerName,
      t.shootDate?.split("T")[0] || "",
      t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "",
      t.service,
      t.gender,
      t.isInfluencer ? "Yes" : "No",
      t.status,
      Array.isArray(t.assignedTo) ? t.assignedTo.join(" / ") : "",
      t.note || "",
      t.seriesId || "",
      t.partNumber ? String(t.partNumber) : ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(escape).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `media-tracker-sheet-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reset all filters & search
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setServiceFilter("all");
    setGenderFilter("all");
    setInfluencerFilter("all");
    setSortField("createdAt");
    setSortDirection("desc");
  };

  const isFiltersActive = searchQuery !== "" || statusFilter !== "all" || serviceFilter !== "all" || genderFilter !== "all" || influencerFilter !== "all";

  return (
    <AppLayout>
      <div className="p-4 space-y-4 max-w-7xl mx-auto pb-24">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 border border-border dark:border-gray-800 rounded-md">
          <div>
            <h1 className="text-heading-3 text-fg-primary dark:text-gray-100 flex items-center gap-2">
              <span>📊</span> Database Spreadsheet View
            </h1>
            <p className="text-caption text-fg-tertiary dark:text-gray-400 mt-1">
              Inspect and query all recorded media tasks in a dense table format. Search by any text metric.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchAllTasks}
              className="btn-ghost flex items-center gap-1.5 py-1.5 px-3 rounded text-sm text-fg-secondary"
              title="Refresh Task Database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={sortedTasks.length === 0}
              className="btn-primary flex items-center gap-1.5 py-1.5 px-3 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV ({sortedTasks.length})
            </button>
          </div>
        </div>

        {/* Dynamic Metric Cards Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 p-3 rounded-md flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-[590] text-sm">
              ∑
            </div>
            <div>
              <div className="text-micro text-fg-quaternary dark:text-gray-500 font-mono">TOTAL ENTRIES</div>
              <div className="text-heading-4 text-fg-primary dark:text-gray-200 mt-0.5">{stats.total}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 p-3 rounded-md flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-micro text-fg-quaternary dark:text-gray-500 font-mono">ACTIVE TASKS</div>
              <div className="text-heading-4 text-fg-primary dark:text-gray-200 mt-0.5">{stats.active}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 p-3 rounded-md flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500/10 text-green-600 dark:text-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-micro text-fg-quaternary dark:text-gray-500 font-mono">COMPLETED</div>
              <div className="text-heading-4 text-fg-primary dark:text-gray-200 mt-0.5">{stats.completed}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 p-3 rounded-md flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Star className="w-4 h-4" fill="currentColor" />
            </div>
            <div>
              <div className="text-micro text-fg-quaternary dark:text-gray-500 font-mono">INFLUENCER</div>
              <div className="text-heading-4 text-fg-primary dark:text-gray-200 mt-0.5">{stats.influencer}</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Panel */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 p-4 rounded-md space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search spreadsheet by task ID, customer name, notes, dates, service, staff..."
              />
            </div>
            {isFiltersActive && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-danger hover:underline whitespace-nowrap self-end md:self-center py-1.5 px-3 rounded bg-danger/5 border border-danger/10"
              >
                Clear Filters / Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Status Selector */}
            <div className="space-y-1">
              <label className="text-micro text-fg-tertiary dark:text-gray-400 font-[510]">STATUS</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="select-linear w-full text-xs py-1.5 bg-white dark:bg-gray-800 h-9"
              >
                <option value="all">All Statuses ({uniqueStatuses.length})</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Service Selector */}
            <div className="space-y-1">
              <label className="text-micro text-fg-tertiary dark:text-gray-400 font-[510]">SERVICE</label>
              <select
                value={serviceFilter}
                onChange={e => setServiceFilter(e.target.value)}
                className="select-linear w-full text-xs py-1.5 bg-white dark:bg-gray-800 h-9"
              >
                <option value="all">All Services ({uniqueServices.length})</option>
                {uniqueServices.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>

            {/* Gender Selector */}
            <div className="space-y-1">
              <label className="text-micro text-fg-tertiary dark:text-gray-400 font-[510]">GENDER</label>
              <select
                value={genderFilter}
                onChange={e => setGenderFilter(e.target.value)}
                className="select-linear w-full text-xs py-1.5 bg-white dark:bg-gray-800 h-9"
              >
                <option value="all">All Genders</option>
                {appConfig.genders.map(gender => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
            </div>

            {/* Influencer Selector */}
            <div className="space-y-1">
              <label className="text-micro text-fg-tertiary dark:text-gray-400 font-[510]">INFLUENCER</label>
              <select
                value={influencerFilter}
                onChange={e => setInfluencerFilter(e.target.value)}
                className="select-linear w-full text-xs py-1.5 bg-white dark:bg-gray-800 h-9"
              >
                <option value="all">All Tasks</option>
                <option value="true">Influencer Only</option>
                <option value="false">Non-Influencer Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Database Error State */}
        {error && (
          <div className="bg-danger/10 text-danger border border-danger/20 rounded-md p-4 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold">Failed to load Task database</h4>
              <p className="mt-1 text-xs opacity-90">{error}</p>
              <button 
                onClick={fetchAllTasks}
                className="mt-3 px-3 py-1.5 bg-danger text-white rounded text-xs hover:bg-danger-hover font-medium flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Fetch
              </button>
            </div>
          </div>
        )}

        {/* Table Container */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto [scrollbar-width:thin]">
            <table className="w-full border-collapse text-left text-sm table-fixed min-w-[1100px]">
              <thead>
                <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-border dark:border-gray-800 text-micro font-mono text-fg-tertiary dark:text-gray-400 select-none">
                  <th 
                    onClick={() => handleSort("id")}
                    className="w-32 px-3 py-3 font-semibold group cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      TASK ID {renderSortIndicator("id")}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("customerName")}
                    className="w-48 px-3 py-3 font-semibold group cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      CUSTOMER {renderSortIndicator("customerName")}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("shootDate")}
                    className="w-32 px-3 py-3 font-semibold group cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      SHOOT DATE {renderSortIndicator("shootDate")}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("dueDate")}
                    className="w-32 px-3 py-3 font-semibold group cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      DUE DATE {renderSortIndicator("dueDate")}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("service")}
                    className="w-32 px-3 py-3 font-semibold group cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      SERVICE {renderSortIndicator("service")}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("gender")}
                    className="w-24 px-3 py-3 font-semibold group cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      GENDER {renderSortIndicator("gender")}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("status")}
                    className="w-36 px-3 py-3 font-semibold group cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      STATUS {renderSortIndicator("status")}
                    </div>
                  </th>
                  <th className="w-40 px-3 py-3 font-semibold">ASSIGNED STAFF</th>
                  <th className="w-64 px-3 py-3 font-semibold">NOTE</th>
                  <th 
                    onClick={() => handleSort("createdAt")}
                    className="w-44 px-3 py-3 font-semibold group cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      CREATED AT {renderSortIndicator("createdAt")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-gray-800/60 font-sans">
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-3 py-3"><div className="h-4 bg-black/[0.06] dark:bg-white/[0.06] rounded w-20"></div></td>
                      <td className="px-3 py-3"><div className="h-4 bg-black/[0.06] dark:bg-white/[0.06] rounded w-32"></div></td>
                      <td className="px-3 py-3"><div className="h-4 bg-black/[0.06] dark:bg-white/[0.06] rounded w-24"></div></td>
                      <td className="px-3 py-3"><div className="h-4 bg-black/[0.06] dark:bg-white/[0.06] rounded w-24"></div></td>
                      <td className="px-3 py-3"><div className="h-4 bg-black/[0.06] dark:bg-white/[0.06] rounded w-20"></div></td>
                      <td className="px-3 py-3"><div className="h-4 bg-black/[0.06] dark:bg-white/[0.06] rounded w-12"></div></td>
                      <td className="px-3 py-3"><div className="h-6 bg-black/[0.06] dark:bg-white/[0.06] rounded w-24"></div></td>
                      <td className="px-3 py-3"><div className="h-4 bg-black/[0.06] dark:bg-white/[0.06] rounded w-24"></div></td>
                      <td className="px-3 py-3"><div className="h-4 bg-black/[0.06] dark:bg-white/[0.06] rounded w-48"></div></td>
                      <td className="px-3 py-3"><div className="h-4 bg-black/[0.06] dark:bg-white/[0.06] rounded w-28"></div></td>
                    </tr>
                  ))
                ) : sortedTasks.length === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <div className="text-3xl mb-3">📁</div>
                      <p className="text-body font-medium text-fg-secondary">No entries found matching filters</p>
                      <p className="text-xs text-fg-tertiary mt-1">Try resetting the filters or typing a different search query.</p>
                      {isFiltersActive && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-4 inline-flex items-center gap-1.5 btn-ghost py-1.5 px-3 rounded text-xs"
                        >
                          Clear all search and filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  // Data rows
                  sortedTasks.map((task) => {
                    const shootDateStr = new Date(task.shootDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    });
                    const dueDateStr = task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })
                      : "—";

                    const createdAtStr = new Date(task.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    const assigned = Array.isArray(task.assignedTo) ? task.assignedTo : [];

                    return (
                      <tr 
                        key={task.id}
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.015] cursor-pointer group/row transition-colors"
                        title="Click to view/edit details"
                      >
                        {/* ID Column */}
                        <td className="px-3 py-2.5 font-mono text-xs font-[510] text-[#006994] dark:text-[#72cdf4] group-hover/row:underline flex items-center gap-1.5">
                          <span>{task.id}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/row:opacity-100 transition-opacity text-fg-tertiary" />
                        </td>
                        
                        {/* Customer Column */}
                        <td className="px-3 py-2.5 text-fg-primary dark:text-gray-100 font-medium font-sans">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[150px]">{task.customerName}</span>
                            {task.isInfluencer && (
                              <Star className="w-3 h-3 text-accent flex-shrink-0" fill="currentColor" />
                            )}
                          </div>
                        </td>

                        {/* Shoot Date Column */}
                        <td className="px-3 py-2.5 text-fg-secondary dark:text-gray-300 text-xs">
                          {shootDateStr}
                        </td>

                        {/* Due Date Column */}
                        <td className="px-3 py-2.5 text-fg-secondary dark:text-gray-300 text-xs">
                          {task.dueDate && task.status !== "Task Completed" && task.status !== "Dropped" && new Date(task.dueDate).getTime() < Date.now() ? (
                            <span className="text-danger font-medium">{dueDateStr} (Overdue)</span>
                          ) : (
                            dueDateStr
                          )}
                        </td>

                        {/* Service Column */}
                        <td className="px-3 py-2.5 text-fg-secondary dark:text-gray-300 text-xs">
                          {task.service}
                        </td>

                        {/* Gender Column */}
                        <td className="px-3 py-2.5 text-fg-secondary dark:text-gray-300 text-xs">
                          {task.gender}
                        </td>

                        {/* Status Column */}
                        <td className="px-3 py-2.5">
                          <StatusBadge status={task.status} />
                        </td>

                        {/* Assigned To Column */}
                        <td className="px-3 py-2.5 text-xs text-fg-secondary dark:text-gray-300">
                          {assigned.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap max-w-full">
                              <Users className="w-3 h-3 text-fg-quaternary dark:text-gray-500 mr-0.5 flex-shrink-0" />
                              {assigned.map((user) => (
                                <span 
                                  key={user} 
                                  className="text-micro bg-black/[0.03] dark:bg-white/[0.05] border border-border dark:border-gray-800 px-1 py-0.5 rounded-sm"
                                >
                                  {user}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-fg-quaternary dark:text-gray-600 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Note Column */}
                        <td className="px-3 py-2.5 text-xs text-fg-tertiary dark:text-gray-400">
                          {task.note ? (
                            <div className="line-clamp-1 max-w-[250px]" title={task.note}>
                              {task.note}
                            </div>
                          ) : (
                            <span className="text-fg-quaternary dark:text-gray-600 italic">—</span>
                          )}
                        </td>

                        {/* Created At Column */}
                        <td className="px-3 py-2.5 text-xs text-fg-quaternary dark:text-gray-500 font-mono">
                          {createdAtStr}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Dense Table Footer Summary */}
          {!loading && sortedTasks.length > 0 && (
            <div className="bg-black/[0.01] dark:bg-white/[0.01] border-t border-border dark:border-gray-800/80 px-4 py-3 flex items-center justify-between text-xs text-fg-tertiary dark:text-gray-400">
              <div>
                Showing <strong className="font-semibold text-fg-secondary">{sortedTasks.length}</strong> of{" "}
                <strong className="font-semibold text-fg-secondary">{tasks.length}</strong> tasks in database
              </div>
              <div className="font-mono text-tiny">
                Active: {stats.active} | Completed: {stats.completed} | Influencer: {stats.influencer}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
