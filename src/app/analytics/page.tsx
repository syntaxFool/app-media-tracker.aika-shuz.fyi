"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "@/components/layout";
import {
  BarChart3, TrendingUp, PieChart, AlertTriangle, Users, UserCheck,
  RefreshCw, Download, Share2, FileSpreadsheet, Image, X, CheckCircle2,
  Clock,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  New: "#72cdf4", "Video Shot": "#ffd200", "Data Copied": "#006994",
  "Video Edited": "#6366f1", Reviewed: "#f59e0b", Approved: "#14b8a6",
  Rejected: "#ef4444", Uploaded: "#10b981",
  "Task Completed": "#27a644", Dropped: "#9ca3af",
};

const STATUS_ORDER = ["New", "Video Shot", "Data Copied", "Video Edited", "Reviewed", "Approved", "Rejected", "Uploaded", "Task Completed", "Dropped"];

const TIMEFRAMES = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "This Month" },
  { value: "all", label: "All Time" },
] as const;

function fillAllStatuses(items: { status: string; count: number }[]) {
  const map = new Map(items.map((i) => [i.status, i.count]));
  return STATUS_ORDER.map((s) => ({ status: s, count: map.get(s) || 0 }));
}

function generateCSV(data: any, timeframe: string): string {
  const rows = [
    ["Task ID", "Creation Date", "Service Type", "Influencer Status", "Current Stage", "Assignee", "Completion Date"],
  ];

  if (data.rawTasks) {
    data.rawTasks.forEach((t: any) => {
      const completedDate = t.status === "Task Completed" ? new Date(t.updatedAt || t.createdAt).toLocaleDateString("en-IN") : "";
      rows.push([
        t.id,
        new Date(t.createdAt).toLocaleDateString("en-IN"),
        t.service || "—",
        t.isInfluencer ? "Yes" : "No",
        t.status,
        Array.isArray(t.assignedTo) ? t.assignedTo.join("; ") : "—",
        completedDate,
      ]);
    });
  }

  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "influencer" | "regular">("all");
  const [showExport, setShowExport] = useState(false);
  const [exportTimeframe, setExportTimeframe] = useState<string>("30d");
  const [exporting, setExporting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/analytics?type=${filterType}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/tasks`).then((r) => r.ok ? r.json() : null),
    ]).then(([analytics, tasks]) => {
      if (analytics) {
        analytics.rawTasks = tasks?.tasks || [];
        setData(analytics);
      }
    }).finally(() => setLoading(false));
  }, [filterType]);

  // Detect when the sticky header has detached from the top of the scroll
  // container so we can paint a subtle shadow under it.
  // IMPORTANT: ignore the initial observer fire — the sentinel sits above
  // the rootMargin-adjusted top of <main> on mount, which would otherwise
  // flip `scrolled` to true immediately and render the frosted background
  // on first paint (the "grey block" above the title).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    let initialFired = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!initialFired) {
          initialFired = true;
          return;
        }
        setScrolled(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  if (loading) return <AppLayout><div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 text-fg-tertiary animate-spin"/></div></AppLayout>;
  if (!data) return <AppLayout><div className="p-4 text-center text-fg-tertiary">Unable to load analytics</div></AppLayout>;

  const baseStatuses = data.statusBreakdown || [];
  const existingStatuses = new Set(baseStatuses.map((s: any) => s.status));
  const mergedStatuses = [...baseStatuses];
  if (!existingStatuses.has("Rejected")) {
    const rejectedCount = Math.round((data.rejectionRate / 100) * data.totalTasks);
    if (rejectedCount > 0) mergedStatuses.push({ status: "Rejected", count: rejectedCount });
  }
  const statusBreakdown = fillAllStatuses(mergedStatuses);
  const maxStatus = Math.max(...statusBreakdown.map((s: any) => s.count), 1);

  const serviceBreakdown = (data.serviceBreakdown || []).slice().sort((a: any, b: any) => b.count - a.count);
  const maxService = Math.max(...serviceBreakdown.map((s: any) => s.count), 1);
  const monthlyTrend = (data.monthlyTrend || []).slice();
  const maxMonthly = Math.max(...monthlyTrend.map((m: any) => m.total), 1);

  // ── CSV Export ──
  async function handleCSVExport() {
    setExporting("csv");
    try {
      // Fetch raw tasks with the timeframe filter
      let url = `/api/tasks`;
      if (exportTimeframe === "7d") {
        const d = new Date(); d.setDate(d.getDate() - 7);
        url += `?createdAfter=${d.toISOString()}`;
      } else if (exportTimeframe === "30d") {
        const d = new Date(); d.setMonth(d.getMonth() - 1);
        url += `?createdAfter=${d.toISOString()}`;
      }
      let rawTasks = data.rawTasks || [];
      if (exportTimeframe !== "all") {
        const res = await fetch(url);
        if (res.ok) rawTasks = (await res.json()).tasks || [];
      }

      const csv = generateCSV({ ...data, rawTasks }, exportTimeframe);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `shanuzz-analytics-${exportTimeframe}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast("CSV saved to Downloads");
    } catch {
      showToast("Export failed", "error");
    } finally {
      setExporting(null);
      setShowExport(false);
    }
  }

  // ── WhatsApp / PNG Share ──
  async function handleShareReport() {
    setExporting("png");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = dashboardRef.current;
      if (!el) throw new Error("Dashboard not found");

      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Failed to generate image");

      const timeframeLabel = TIMEFRAMES.find((t) => t.value === exportTimeframe)?.label || "All Time";
      const summary = `*Shanuzz Tracker Analytics* — ${timeframeLabel}\n` +
        `${data.totalTasks} Total Tasks | ${data.influencerRatio}% Influencer\n` +
        `Rejection Rate: ${data.rejectionRate}% | Avg TAT: ${data.avgTatDays > 0 ? data.avgTatDays + "d" : "—"}`;

      // Try Web Share API first
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], "shanuzz-analytics.png", { type: "image/png" });
        const shareData = { title: "Shanuzz Analytics", text: summary, files: [file] };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          showToast("Report shared");
          setShowExport(false);
          return;
        }
      }

      // Fallback: download image + copy summary
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `shanuzz-analytics-${exportTimeframe}-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      URL.revokeObjectURL(link.href);

      // Copy summary to clipboard
      try {
        await navigator.clipboard.writeText(summary.replace(/\*/g, ""));
      } catch { /* silent */ }

      showToast("Report image downloaded. Share it manually on WhatsApp.");
    } catch {
      showToast("Failed to generate report", "error");
    } finally {
      setExporting(null);
      setShowExport(false);
    }
  }

  return (
    <AppLayout>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] animate-fade-in">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-md shadow-elev-dialog text-sm font-[510] ${
            toast.type === "success"
              ? "bg-success/10 text-success border border-success/20"
              : "bg-danger/10 text-danger border border-danger/20"
          }`}>
            <CheckCircle2 className="w-4 h-4" />
            {toast.message}
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 pt-0 pb-24 max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Sentinel: when this 1px line leaves the viewport, the sticky
            header has detached and we paint a shadow under it. */}
        <div ref={sentinelRef} className="h-px -mb-px" aria-hidden />

        {/* Sticky Header — sticks at the top of <main> (which sits directly
            below AppLayout's blue 56px top bar).  Row 1 = title + export.
            Row 2 = segmented filter. */}
        <div
          className={`relative sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-3 pb-3 -mt-6
                       bg-surface dark:bg-gray-950
                       backdrop-blur-md backdrop-saturate-150
                       transition-all duration-300 ease-spring ${
            scrolled
              ? "shadow-[0_8px_24px_-8px_rgba(0,105,148,0.18),0_2px_6px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)] ring-1 ring-primary/10 dark:ring-primary/20"
              : "shadow-none ring-0"
          }`}
        >
          {/* Row 1: Title + Export */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <BarChart3 className="w-6 h-6 text-primary flex-shrink-0" />
              <h1 className="text-heading-3 text-fg-primary dark:text-white font-semibold">Analytics</h1>
              <button
                onClick={() => setShowExport(true)}
                className="btn-subtle text-micro px-2 py-1 flex items-center gap-1.5"
                title="Export"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* Row 2: Segmented filter control — full-width, evenly distributed */}
          <div className="flex flex-row items-stretch bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-sm overflow-hidden">
            {(["all", "influencer", "regular"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex-1 flex items-center justify-center text-[11px] sm:text-micro font-[510] py-2 transition-all ${
                  filterType === type
                    ? "bg-primary text-white"
                    : "text-fg-tertiary hover:text-fg-primary dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {type === "all" ? (
                  "All"
                ) : type === "influencer" ? (
                  <span className="flex items-center gap-[3px]">
                    <span className="text-[11px]">⭐</span>
                    <span>Influencer</span>
                  </span>
                ) : (
                  "Regular"
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Export Bottom-Sheet */}
        {showExport && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => !exporting && setShowExport(false)}>
            <div className="fixed inset-0 bg-black/40 animate-fade-in" />
            <div
              className="relative bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl w-full sm:max-w-sm p-6 shadow-elev-dialog animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-heading-3 text-fg-primary dark:text-white font-semibold">Export Analytics</h3>
                <button onClick={() => setShowExport(false)} className="btn-subtle p-1.5" disabled={!!exporting}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Timeframe Selector */}
              <div className="mb-5">
                <p className="text-label text-fg-tertiary mb-2">Select Date Range</p>
                <div className="flex gap-2">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => setExportTimeframe(tf.value)}
                      className={`flex-1 text-micro font-[510] py-2 rounded-sm border transition-all ${
                        exportTimeframe === tf.value
                          ? "bg-primary text-white border-primary"
                          : "bg-transparent text-fg-tertiary border-border dark:border-gray-700 hover:border-primary/30 dark:hover:border-primary/30"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Share Report (WhatsApp / PNG) */}
              <button
                onClick={handleShareReport}
                disabled={!!exporting}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-sm border border-[#25D366]/30 bg-[#25D366]/5 hover:bg-[#25D366]/10 transition-all mb-2 disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-[#25D366]/15 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-5 h-5 text-[#25D366]" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-[510] text-fg-primary dark:text-white">
                    {exporting === "png" ? "Generating report..." : "Share Report"}
                  </span>
                  <p className="text-tiny text-fg-tertiary">PNG snapshot — share on WhatsApp</p>
                </div>
                {exporting === "png" && <RefreshCw className="w-4 h-4 text-fg-tertiary animate-spin" />}
              </button>

              {/* Download CSV */}
              <button
                onClick={handleCSVExport}
                disabled={!!exporting}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-sm border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-[510] text-fg-primary dark:text-white">
                    {exporting === "csv" ? "Downloading..." : "Download Data"}
                  </span>
                  <p className="text-tiny text-fg-tertiary">CSV — raw data for spreadsheets</p>
                </div>
                {exporting === "csv" && <RefreshCw className="w-4 h-4 text-fg-tertiary animate-spin" />}
              </button>

              {/* Footer hint */}
              <p className="text-tiny text-fg-quaternary text-center mt-4">
                Data scoped to <span className="font-[510] text-fg-tertiary">{TIMEFRAMES.find((t) => t.value === exportTimeframe)?.label}</span>
              </p>
            </div>
          </div>
        )}

        {/* Dashboard content — captured for PNG export */}
        <div ref={dashboardRef} className="space-y-5">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <MetricCard value={data.totalTasks} label="Total Tasks" color="text-primary" />
            <MetricCard value={`${data.influencerRatio}%`} label="Influencer" color="text-accent" />
            <MetricCard value={statusBreakdown.find((s: any) => s.status === "Task Completed")?.count || 0} label="Completed" color="text-success" />
            <MetricCard value={`${data.rejectionRate}%`} label="Rejection Rate" color={data.rejectionRate > 20 ? "text-danger" : data.rejectionRate > 10 ? "text-warning" : "text-success"} />
            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
              <MetricCard
                value={data.avgTatDays > 0 ? `${data.avgTatDays}d` : "0.0d"}
                label="Avg TAT (Shot→Up)"
                color={data.avgTatDays > 0 ? "text-primary" : "text-fg-quaternary"}
              />
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/60 dark:border-gray-800">
              <PieChart className="w-4 h-4 text-fg-tertiary" />
              <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">Status Distribution</p>
              <span className="text-tiny text-fg-quaternary ml-auto">{statusBreakdown.reduce((a:any,b:any)=>a+b.count,0)} tasks</span>
            </div>
            <div className="space-y-2.5">
              {statusBreakdown.map((s: any) => (
                <div key={s.status} className="flex items-center gap-3">
                  <span className="text-caption text-fg-tertiary dark:text-gray-400 w-28 text-right flex-shrink-0 truncate" title={s.status}>
                    {s.status === "Rejected" ? "⛔ Rejected" : s.status}
                  </span>
                  <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-4 sm:h-5 overflow-hidden">
                    <div className="h-full min-w-[6px] rounded-full transition-all duration-700 ease-out" style={{ width: `${(s.count / maxStatus) * 100}%`, backgroundColor: STATUS_COLORS[s.status] || "#95a5b5" }} />
                  </div>
                  <span className="text-caption font-[510] text-fg-primary dark:text-white min-w-[28px] text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rejection Analysis */}
          {data.rejectionsByStage && Object.keys(data.rejectionsByStage).length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/60 dark:border-gray-800">
                <AlertTriangle className="w-4 h-4 text-danger" />
                <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">Rejection Analysis</p>
                <span className="text-tiny text-fg-quaternary ml-auto">{Object.values(data.rejectionsByStage as Record<string, number>).reduce((a: number, b: number) => a + b, 0)} total</span>
              </div>
              <div className="space-y-2.5">
                {Object.entries(data.rejectionsByStage as Record<string, number>).sort(([, a], [, b]) => b - a).map(([stage, count]) => {
                  const totalRejections = Object.values(data.rejectionsByStage as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
                  const pct = totalRejections > 0 ? Math.round((count / totalRejections) * 100) : 0;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <span className="text-caption text-fg-tertiary dark:text-gray-400 w-28 text-right flex-shrink-0">{stage}</span>
                      <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-5 overflow-hidden">
                        <div className="h-full min-w-[6px] rounded-full bg-danger/70 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-caption font-[510] text-fg-primary dark:text-white min-w-[40px] text-right">{count}</span>
                      <span className="text-tiny text-fg-tertiary w-10">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly Trend */}
          {monthlyTrend.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/60 dark:border-gray-800">
                <TrendingUp className="w-4 h-4 text-fg-tertiary" />
                <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">Monthly Trend</p>
              </div>
              <div className="space-y-3">
                {monthlyTrend.map((m: any) => {
                  const totalBar = (m.total / maxMonthly) * 100;
                  const completedBar = m.total > 0 ? (m.completed / m.total) * totalBar : 0;
                  return (
                    <div key={m.month} className="flex items-start gap-3">
                      <span className="text-caption text-fg-tertiary dark:text-gray-400 w-16 flex-shrink-0 font-mono text-xs mt-1">{m.month}</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-tiny">
                          <span className="text-fg-quaternary">Created</span>
                          <span className="font-[510] text-fg-primary dark:text-white">{m.total} total</span>
                        </div>
                        <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-4 overflow-hidden">
                          <div className="h-full min-w-[6px] rounded-full bg-primary/60 transition-all duration-700 ease-out" style={{ width: `${totalBar}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-tiny">
                          <span className="text-fg-quaternary">Completed</span>
                          <span className="text-success">{m.completed} done</span>
                        </div>
                        <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-4 overflow-hidden">
                          <div className="h-full min-w-[6px] rounded-full bg-success/70 transition-all duration-500" style={{ width: `${completedBar}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border dark:border-gray-700 text-tiny text-fg-tertiary">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary/60" /> Created</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-success/70" /> Completed</span>
              </div>
            </div>
          )}

          {/* Team Performance */}
          {data.assigneeBreakdown && data.assigneeBreakdown.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/60 dark:border-gray-800">
                  <Users className="w-4 h-4 text-fg-tertiary" />
                  <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">Assignee Productivity</p>
                </div>
                <div className="space-y-3">
                  {data.assigneeBreakdown.slice().sort((a: any, b: any) => b.total - a.total).map((a: any) => {
                    const maxTotal = Math.max(...data.assigneeBreakdown.map((x: any) => x.total), 1);
                    const barWidth = (a.total / maxTotal) * 100;
                    return (
                      <div key={a.username}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-caption font-[510] text-fg-primary dark:text-gray-100">{a.username}</span>
                          <span className="text-tiny text-fg-tertiary">
                            <span className="text-success/80">{a.completed}</span>
                            <span className="text-fg-quaternary">/{a.total} done</span>
                          </span>
                        </div>
                        <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-4 overflow-hidden">
                          <div className="h-full min-w-[6px] rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${barWidth}%` }} />
                        </div>
                        <div className="flex gap-3 mt-1 text-tiny text-fg-quaternary">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning/60" /> {a.pending} pending</span>
                          {a.rejected > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-danger/60" /> {a.rejected} rejected</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {data.qualityScores && data.qualityScores.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/60 dark:border-gray-800">
                    <UserCheck className="w-4 h-4 text-fg-tertiary" />
                    <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">Quality Scores</p>
                  </div>
                  <div className="space-y-3.5">
                    {data.qualityScores.slice().sort((a: any, b: any) => b.reworkRate - a.reworkRate).map((q: any) => (
                      <div key={q.username} className="flex items-center justify-between">
                        <div>
                          <span className="text-caption font-[510] text-fg-primary dark:text-gray-100">{q.username}</span>
                          <span className="text-tiny text-fg-quaternary ml-2">{q.reworkCount}/{q.totalAssigned} reworks</span>
                        </div>
                        <span className={`text-caption font-[590] ${q.reworkRate > 30 ? "text-danger" : q.reworkRate > 15 ? "text-warning" : "text-success"}`}>
                          {q.reworkRate}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* By Service */}
          {serviceBreakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/60 dark:border-gray-800">
                <TrendingUp className="w-4 h-4 text-fg-tertiary" />
                <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">By Service</p>
                <span className="text-tiny text-fg-quaternary ml-auto">{serviceBreakdown.reduce((a:any,b:any)=>a+b.count,0)} tasks</span>
              </div>
              <div className="space-y-2.5">
                {serviceBreakdown.map((s: any, idx: number) => {
                  const hue = (idx * 37 + 200) % 360;
                  return (
                    <div key={s.service} className="flex items-center gap-3">
                      <span className="text-caption text-fg-tertiary dark:text-gray-400 w-32 text-right flex-shrink-0 truncate" title={s.service}>{s.service}</span>
                      <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-5 overflow-hidden">
                        <div className="h-full min-w-[6px] rounded-full transition-all duration-500" style={{ width: `${(s.count / maxService) * 100}%`, backgroundColor: `hsl(${hue}, 55%, 50%)` }} />
                      </div>
                      <span className="text-caption font-[510] text-fg-primary dark:text-white min-w-[28px] text-right">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function MetricCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="relative bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-3 sm:p-4 md:p-5 shadow-sm text-center overflow-hidden">
      {/* Subtle gradient accent at the top */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <p className={`text-heading-3 sm:text-heading-3 md:text-heading-2 leading-none ${color} font-bold mt-1.5`}>{value}</p>
      <p className="text-micro sm:text-caption text-fg-tertiary dark:text-gray-400 mt-1.5 font-[510]">{label}</p>
    </div>
  );
}
