// GET  /api/notifications — List notifications
// PUT  /api/notifications/read — Mark all as read
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

    // Mark fetched ones as read
    if (unreadIds.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: unreadIds } },
        data: { read: true },
      });
    }

    return NextResponse.json({ notifications });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
