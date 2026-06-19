// GET /api/notifications/count — Return unread notification count
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const count = await prisma.notification.count({ where: { read: false } });
    return NextResponse.json({ count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
