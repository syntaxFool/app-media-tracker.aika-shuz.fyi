"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout";
import { BarChart3, TrendingUp, PieChart, AlertTriangle, Clock, Users, Star, UserCheck, RefreshCw } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  New: "#72cdf4", "Video Shot": "#ffd200", "Data Copied": "#005581",
  "Video Edited": "#6366f1", Reviewed: "#f59e0b", Approved: "#8b5cf6",
  Rejected: "#ef4444", Uploaded: "#10b981",
  "Task Completed": "#27a644", Dropped: "#9ca3af",
};

const STATUS_ORDER = ["New", "Video Shot", "Data Copied", "Video Edited", "Reviewed", "Approved", "Rejected", "Uploaded", "Task Completed", "Dropped"];

function sortByStatusOrder(items: { status: string; count: number }[]) {
  const map = new Map(items.map((i) => [i.status, i]));
  return STATUS_ORDER.filter((s) => map.has(s)).map((s) => map.get(s)!);
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "influencer" | "regular">("all");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?type=${filterType}`)
      .then((r) => { if (r.ok) r.json().then(setData); })
      .finally(() => setLoading(false));
  }, [filterType]);

  if (loading) return <AppLayout><div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 text-fg-tertiary animate-spin"/></div></AppLayout>;
  if (!data) return <AppLayout><div className="p-4 text-center text-fg-tertiary">Unable to load analytics</div></AppLayout>;

  // Merge a derived "Rejected" row into status breakdown
  const baseStatuses = data.statusBreakdown || [];
  const existingStatuses = new Set(baseStatuses.map((s: any) => s.status));
  let derivedRejectedCount = 0;
  // Count tasks with a rejectionNote that aren't already counted under a "Rejected" status
  if (!existingStatuses.has("Rejected")) {
    derivedRejectedCount = data.rejectedTasksCount || 0;
    // Approximate from rejectionRate
    derivedRejectedCount = Math.round((data.rejectionRate / 100) * data.totalTasks);
  }
  const mergedStatuses = [...baseStatuses];
  if (!existingStatuses.has("Rejected") && derivedRejectedCount > 0) {
    mergedStatuses.push({ status: "Rejected", count: derivedRejectedCount });
  }
  const statusBreakdown = sortByStatusOrder(mergedStatuses);
  const maxStatus = Math.max(...statusBreakdown.map((s: any) => s.count), 1);

  const serviceBreakdown = (data.serviceBreakdown || [])
    .slice()
    .sort((a: any, b: any) => b.count - a.count);
  const maxService = Math.max(...serviceBreakdown.map((s: any) => s.count), 1);

  const monthlyTrend = (data.monthlyTrend || []).slice();
  const maxMonthly = Math.max(...monthlyTrend.map((m: any) => m.total), 1);

  return (
    <AppLayout>
      <div className="p-4 max-w-4xl mx-auto space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-heading-3 text-fg-primary dark:text-white font-semibold">Analytics</h1>
          </div>
          {/* Influencer Toggle */}
          <div className="flex bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-sm p-0.5">
            {(["all", "influencer", "regular"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-micro font-[510] px-2.5 py-1 rounded-sm transition-all ${
                  filterType === type
                    ? "bg-primary text-white shadow-sm"
                    : "text-fg-tertiary hover:text-fg-primary dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {type === "all" ? "All" : type === "influencer" ? "⭐ Influencer" : "Regular"}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MetricCard value={data.totalTasks} label="Total Tasks" color="text-primary" />
          <MetricCard value={`${data.influencerRatio}%`} label="Influencer" color="text-accent" />
          <MetricCard
            value={statusBreakdown.find((s: any) => s.status === "Task Completed")?.count || 0}
            label="Completed"
            color="text-success"
          />
          <MetricCard value={`${data.rejectionRate}%`} label="Rejection Rate" color={data.rejectionRate > 20 ? "text-danger" : data.rejectionRate > 10 ? "text-warning" : "text-success"} />
          <MetricCard value={data.avgTatDays > 0 ? `${data.avgTatDays}d` : "—"} label="Avg TAT (Shot→Up)" color="text-primary" />
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-fg-tertiary" />
            <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">Status Distribution</p>
          </div>
          <div className="space-y-2">
            {statusBreakdown.map((s: any) => (
              <div key={s.status} className="flex items-center gap-3">
                <span className="text-caption text-fg-tertiary dark:text-gray-400 w-28 text-right flex-shrink-0 truncate" title={s.status}>
                  {s.status === "Rejected" ? "⛔ Rejected" : s.status}
                </span>
                <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(s.count / maxStatus) * 100}%`,
                      backgroundColor: STATUS_COLORS[s.status] || "#95a5b5",
                    }}
                  />
                </div>
                <span className="text-caption font-[510] text-fg-primary dark:text-white min-w-[28px] text-right">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rejection Analysis */}
        {data.rejectionsByStage && Object.keys(data.rejectionsByStage).length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">Rejection Analysis</p>
            </div>
            <div className="space-y-2">
              {Object.entries(data.rejectionsByStage as Record<string, number>)
                .sort(([, a], [, b]) => b - a)
                .map(([stage, count]) => {
                  const totalRejections = Object.values(data.rejectionsByStage as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
                  const pct = totalRejections > 0 ? Math.round((count / totalRejections) * 100) : 0;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <span className="text-caption text-fg-tertiary dark:text-gray-400 w-28 text-right flex-shrink-0">{stage}</span>
                      <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-5 overflow-hidden">
                        <div className="h-full rounded-full bg-danger/70 transition-all duration-500" style={{ width: `${pct}%` }} />
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
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-fg-tertiary" />
              <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">Monthly Trend</p>
            </div>
            <div className="space-y-2.5">
              {monthlyTrend.map((m: any) => {
                const totalBar = (m.total / maxMonthly) * 100;
                const completedBar = m.total > 0 ? (m.completed / m.total) * totalBar : 0;
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-caption text-fg-tertiary dark:text-gray-400 w-16 flex-shrink-0 font-mono text-xs">
                      {m.month}
                    </span>
                    <div className="flex-1 space-y-1">
                      {/* Total bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all duration-500"
                            style={{ width: `${totalBar}%` }}
                          />
                        </div>
                      </div>
                      {/* Completed bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-success/70 transition-all duration-500"
                            style={{ width: `${completedBar}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 min-w-[72px]">
                      <span className="text-tiny font-[510] text-fg-primary dark:text-white">{m.total} total</span>
                      <span className="text-tiny text-success ml-1.5">{m.completed} done</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assignee Productivity */}
            <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-fg-tertiary" />
                <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">Assignee Productivity</p>
              </div>
              <div className="space-y-2.5">
                {data.assigneeBreakdown
                  .slice()
                  .sort((a: any, b: any) => b.total - a.total)
                  .map((a: any) => {
                    const maxTotal = Math.max(...data.assigneeBreakdown.map((x: any) => x.total), 1);
                    const barWidth = (a.total / maxTotal) * 100;
                    return (
                      <div key={a.username}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-caption font-[510] text-fg-primary dark:text-gray-100">{a.username}</span>
                          <span className="text-tiny text-fg-tertiary">{a.completed}/{a.total} done</span>
                        </div>
                        <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="flex gap-3 mt-0.5 text-tiny text-fg-quaternary">
                          <span>{a.pending} pending</span>
                          {a.rejected > 0 && <span className="text-danger/70">{a.rejected} rejected</span>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Quality Scores */}
            {data.qualityScores && data.qualityScores.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="w-4 h-4 text-fg-tertiary" />
                  <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">Quality Scores</p>
                </div>
                <div className="space-y-3">
                  {data.qualityScores
                    .slice()
                    .sort((a: any, b: any) => b.reworkRate - a.reworkRate)
                    .map((q: any) => (
                      <div key={q.username} className="flex items-center justify-between">
                        <div>
                          <span className="text-caption font-[510] text-fg-primary dark:text-gray-100">{q.username}</span>
                          <span className="text-tiny text-fg-quaternary ml-2">
                            {q.reworkCount}/{q.totalAssigned} reworks
                          </span>
                        </div>
                        <span
                          className={`text-caption font-[590] ${
                            q.reworkRate > 30
                              ? "text-danger"
                              : q.reworkRate > 15
                                ? "text-warning"
                                : "text-success"
                          }`}
                        >
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
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-fg-tertiary" />
              <p className="text-label text-fg-tertiary font-[510] dark:text-gray-300">By Service</p>
            </div>
            <div className="space-y-2">
              {serviceBreakdown.map((s: any, idx: number) => {
                const hue = (idx * 37 + 200) % 360;
                return (
                  <div key={s.service} className="flex items-center gap-3">
                    <span className="text-caption text-fg-tertiary dark:text-gray-400 w-32 text-right flex-shrink-0 truncate" title={s.service}>
                      {s.service}
                    </span>
                    <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(s.count / maxService) * 100}%`,
                          backgroundColor: `hsl(${hue}, 55%, 50%)`,
                        }}
                      />
                    </div>
                    <span className="text-caption font-[510] text-fg-primary dark:text-white min-w-[28px] text-right">
                      {s.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function MetricCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-3 sm:p-4 shadow-sm text-center">
      <p className={`text-heading-3 sm:text-heading-2 ${color} font-bold`}>{value}</p>
      <p className="text-micro text-fg-tertiary dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
