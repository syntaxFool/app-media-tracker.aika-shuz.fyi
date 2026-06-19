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

    const notification = await prisma.notification.update({
      where: { id: parseInt(params.id) },
      data: { read },
    });

    return NextResponse.json({ notification });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
