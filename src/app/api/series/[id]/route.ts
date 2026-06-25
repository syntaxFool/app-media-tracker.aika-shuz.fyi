// GET /api/series/[id] — Get a single series with all its parts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();

    const parts = await prisma.task.findMany({
      where: { seriesId: params.id },
      orderBy: { partNumber: { sort: "asc", nulls: "last" } },
    });

    if (parts.length === 0) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    return NextResponse.json({
      seriesId: params.id,
      totalParts: parts.length,
      parts,
    });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
