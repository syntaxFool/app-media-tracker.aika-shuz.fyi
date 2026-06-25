// GET /api/series — List all series (distinct seriesId values with aggregate data)
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();

    // Fetch all tasks that belong to a series
    const seriesTasks = await prisma.task.findMany({
      where: { seriesId: { not: null } },
      select: { seriesId: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    // Aggregate in-memory: group by seriesId
    const seriesMap = new Map<string, { totalParts: number; latestUpdatedAt: Date | null; statusCounts: Record<string, number> }>();

    for (const t of seriesTasks) {
      if (!t.seriesId) continue;
      if (!seriesMap.has(t.seriesId)) {
        seriesMap.set(t.seriesId, { totalParts: 0, latestUpdatedAt: null, statusCounts: {} });
      }
      const entry = seriesMap.get(t.seriesId)!;
      entry.totalParts++;
      entry.statusCounts[t.status] = (entry.statusCounts[t.status] || 0) + 1;
      if (!entry.latestUpdatedAt || (t.updatedAt && t.updatedAt > entry.latestUpdatedAt)) {
        entry.latestUpdatedAt = t.updatedAt;
      }
    }

    const result = Array.from(seriesMap.entries()).map(([seriesId, data]) => ({
      seriesId,
      totalParts: data.totalParts,
      latestUpdatedAt: data.latestUpdatedAt,
      statusCounts: data.statusCounts,
    }));

    // Sort by latest updated first
    result.sort((a, b) => {
      if (!a.latestUpdatedAt && !b.latestUpdatedAt) return 0;
      if (!a.latestUpdatedAt) return 1;
      if (!b.latestUpdatedAt) return -1;
      return b.latestUpdatedAt.getTime() - a.latestUpdatedAt.getTime();
    });

    return NextResponse.json({ series: result });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
