"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout";
import { Loader2, BarChart3, TrendingUp, PieChart } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  New: "#72cdf4", "Video Shot": "#ffd200", "Data Copied": "#005581",
  "Video Edited": "#6366f1", Reviewed: "#f59e0b", Uploaded: "#10b981",
  "Task Completed": "#27a644", Dropped: "#9ca3af",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => { if(r.ok) r.json().then(setData); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-fg-tertiary animate-spin"/></div></AppLayout>;
  if (!data) return <AppLayout><div className="p-4 text-center text-fg-tertiary">Unable to load analytics</div></AppLayout>;

  const maxStatus = Math.max(...data.statusBreakdown.map((s:any) => s.count), 1);
  const maxService = Math.max(...data.serviceBreakdown.map((s:any) => s.count), 1);

  return (
    <AppLayout>
      <div className="p-4 max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-3"><BarChart3 className="w-6 h-6 text-primary"/><h1 className="text-heading-3 text-fg-primary">Analytics</h1></div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm text-center">
            <p className="text-heading-2 text-primary">{data.totalTasks}</p>
            <p className="text-micro text-fg-tertiary">Total Tasks</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm text-center">
            <p className="text-heading-2 text-accent">{data.influencerRatio}%</p>
            <p className="text-micro text-fg-tertiary">Influencer</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm text-center">
            <p className="text-heading-2 text-success">{data.statusBreakdown.find((s:any)=>s.status==="Task Completed")?.count||0}</p>
            <p className="text-caption text-fg-quaternary">Dropped: {data.statusBreakdown.find((s:any)=>s.status==="Dropped")?.count||0}</p>
            <p className="text-micro text-fg-tertiary">Completed</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4"><PieChart className="w-4 h-4 text-fg-tertiary"/><p className="text-label text-fg-tertiary font-[510]">Status Distribution</p></div>
          <div className="space-y-2">
            {data.statusBreakdown.map((s: any) => (
              <div key={s.status} className="flex items-center gap-3">
                <span className="text-caption text-fg-tertiary w-32 text-right flex-shrink-0">{s.status}</span>
                <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(s.count/maxStatus)*100}%`, backgroundColor: STATUS_COLORS[s.status] || "#95a5b5" }} />
                </div>
                <span className="text-caption font-[510] text-fg-primary w-8">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-fg-tertiary"/><p className="text-label text-fg-tertiary font-[510]">By Service</p></div>
          <div className="space-y-2">
            {data.serviceBreakdown.map((s: any) => (
              <div key={s.service} className="flex items-center gap-3">
                <span className="text-caption text-fg-tertiary w-32 text-right flex-shrink-0">{s.service}</span>
                <div className="flex-1 bg-surface dark:bg-gray-800 rounded-full h-5 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(s.count/maxService)*100}%` }} />
                </div>
                <span className="text-caption font-[510] text-fg-primary w-8">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        {data.monthlyTrend?.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-border dark:border-gray-800 rounded-md p-4 shadow-sm">
            <p className="text-label text-fg-tertiary font-[510] mb-3">Monthly Trend</p>
            <div className="space-y-1">
              {data.monthlyTrend.map((m: any) => (
                <div key={m.month} className="flex items-center gap-3 text-sm">
                  <span className="text-caption text-fg-tertiary w-20">{m.month}</span>
                  <span className="text-caption text-fg-primary">{m.total} total</span>
                  <span className="text-caption text-success">{m.completed} done</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
