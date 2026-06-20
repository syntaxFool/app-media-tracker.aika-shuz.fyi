import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const activities = await prisma.activityLog.findMany({
      where: { taskId: params.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ activities });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
