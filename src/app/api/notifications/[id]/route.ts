// PUT /api/notifications/[id] — Toggle read/unread
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { read } = await req.json();

    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });

    const notification = await prisma.notification.update({
      where: { id },
      data: { read },
    });

    return NextResponse.json({ notification });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
