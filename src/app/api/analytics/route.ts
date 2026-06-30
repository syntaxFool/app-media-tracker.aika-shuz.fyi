// GET /api/analytics — Return aggregate stats
// Supports ?type=all|influencer|regular to filter by influencer status
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    // Build the isInfluencer filter based on type
    let influencerFilter: { isInfluencer?: boolean } | undefined;
    if (type === "influencer") influencerFilter = { isInfluencer: true };
    else if (type === "regular") influencerFilter = { isInfluencer: false };

    const whereFilter = influencerFilter || {};

    const [totalTasks, statusBreakdown, monthlyTasks, allTasks, rejectionLogs, allActivities, serviceBreakdown] =
      await Promise.all([
        prisma.task.count({ where: whereFilter }),
        prisma.task.groupBy({ by: ["status"], _count: { id: true }, where: whereFilter }),
        prisma.task.findMany({
          where: whereFilter,
          select: { createdAt: true, status: true, rejectionNote: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.task.findMany({
          where: whereFilter,
          select: {
            id: true,
            assignedTo: true,
            status: true,
            rejectionNote: true,
            rejectedBy: true,
            createdAt: true,
            isInfluencer: true,
          },
        }),
        prisma.activityLog.findMany({
          where: {
            action: "status_change",
            detail: { contains: "Reviewed" },
          },
          select: { taskId: true, actor: true, detail: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.activityLog.findMany({
          where: { action: "status_change" },
          select: { taskId: true, detail: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.task.groupBy({ by: ["service"], _count: { id: true }, where: whereFilter }),
      ]);

    // Monthly breakdown
    const monthly: Record<string, { total: number; completed: number }> = {};
    monthlyTasks.forEach((t) => {
      const month = t.createdAt.toISOString().substring(0, 7);
      if (!monthly[month]) monthly[month] = { total: 0, completed: 0 };
      monthly[month].total++;
      if (t.status === "Task Completed") monthly[month].completed++;
    });

    // Influencer ratio (always from unfiltered data)
    const [totalAll, influencersAll] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { isInfluencer: true } }),
    ]);

    // ── Rejection Rate ──
    const rejectedTasks = monthlyTasks.filter((t) => t.rejectionNote);
    const rejectionRate = totalTasks > 0 ? Math.round((rejectedTasks.length / totalTasks) * 100) : 0;

    const rejectionsByStage: Record<string, number> = {};
    rejectedTasks.forEach(() => {
      rejectionsByStage["Reviewed"] = (rejectionsByStage["Reviewed"] || 0) + 1;
    });
    rejectionLogs.forEach((log) => {
      if (log.detail.includes("→ Dropped")) {
        const match = log.detail.match(/Status:\s*(.+?)\s*→/);
        const from = match ? match[1].trim() : "Reviewed";
        rejectionsByStage[from] = (rejectionsByStage[from] || 0) + 1;
      }
    });

    // ── Turnaround Time (Video Shot → Uploaded) ──
    const taskTimeline: Record<string, { status: string; time: Date }[]> = {};
    allActivities.forEach((log) => {
      const match = log.detail.match(/Status:\s*(.+?)\s*→\s*(.+)/);
      if (match) {
        const to = match[2].trim();
        if (!taskTimeline[log.taskId]) taskTimeline[log.taskId] = [];
        taskTimeline[log.taskId].push({ status: to, time: log.createdAt });
      }
    });

    let totalTatDays = 0;
    let tatCount = 0;
    Object.values(taskTimeline).forEach((entries) => {
      const shotEntry = entries.find((e) => e.status === "Video Shot");
      const approvedEntry = entries.find((e) => e.status === "Approved");
      if (shotEntry && approvedEntry && approvedEntry.time > shotEntry.time) {
        const diffMs = approvedEntry.time.getTime() - shotEntry.time.getTime();
        totalTatDays += diffMs / (1000 * 60 * 60 * 24);
        tatCount++;
      }
    });
    const avgTatDays = tatCount > 0 ? Math.round((totalTatDays / tatCount) * 10) / 10 : 0;

    // ── Assignee Productivity ──
    const assigneeMap: Record<string, { total: number; pending: number; completed: number; rejected: number }> = {};
    allTasks.forEach((t) => {
      const assignees: string[] = (t.assignedTo as string[]) || [];
      assignees.forEach((username) => {
        if (!assigneeMap[username]) assigneeMap[username] = { total: 0, pending: 0, completed: 0, rejected: 0 };
        assigneeMap[username].total++;
        if (t.status === "Task Completed") assigneeMap[username].completed++;
        else assigneeMap[username].pending++;
        if (t.rejectionNote) assigneeMap[username].rejected++;
      });
    });

    // ── Quality Scores ──
    const qualityScores: Record<string, { reworkCount: number; totalAssigned: number; reworkRate: number }> = {};
    Object.entries(assigneeMap).forEach(([username, stats]) => {
      qualityScores[username] = {
        reworkCount: stats.rejected,
        totalAssigned: stats.total,
        reworkRate: stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0,
      };
    });

    return NextResponse.json({
      totalTasks,
      statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count.id })),
      monthlyTrend: Object.entries(monthly).map(([month, data]) => ({ month, ...data })),
      serviceBreakdown: serviceBreakdown.map((s) => ({ service: s.service, count: s._count.id })),
      influencerRatio: totalAll > 0 ? Math.round((influencersAll / totalAll) * 100) : 0,
      rejectionRate,
      rejectionsByStage,
      avgTatDays,
      assigneeBreakdown: Object.entries(assigneeMap).map(([username, stats]) => ({ username, ...stats })),
      qualityScores: Object.entries(qualityScores).map(([username, stats]) => ({ username, ...stats })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
