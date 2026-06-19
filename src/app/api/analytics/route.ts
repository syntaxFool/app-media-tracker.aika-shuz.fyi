// GET /api/analytics — Return aggregate stats
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [totalTasks, statusBreakdown, monthlyTasks] = await Promise.all([
      prisma.task.count(),
      prisma.task.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.task.findMany({
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Monthly breakdown
    const monthly: Record<string, { total: number; completed: number }> = {};
    monthlyTasks.forEach((t) => {
      const month = t.createdAt.toISOString().substring(0, 7);
      if (!monthly[month]) monthly[month] = { total: 0, completed: 0 };
      monthly[month].total++;
      if (t.status === "Task Completed") monthly[month].completed++;
    });

    // Service breakdown
    const serviceBreakdown = await prisma.task.groupBy({
      by: ["service"],
      _count: { id: true },
    });

    // Influencer ratio
    const [total, influencers] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { isInfluencer: true } }),
    ]);

    return NextResponse.json({
      totalTasks,
      statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count.id })),
      monthlyTrend: Object.entries(monthly).map(([month, data]) => ({ month, ...data })),
      serviceBreakdown: serviceBreakdown.map((s) => ({ service: s.service, count: s._count.id })),
      influencerRatio: total > 0 ? Math.round((influencers / total) * 100) : 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
