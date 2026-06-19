// GET  /api/tasks/[id]/shot-items — List shot items
// POST /api/tasks/[id]/shot-items — Add shot item
// PUT  /api/tasks/[id]/shot-items — Toggle completion
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const items = await prisma.shotItem.findMany({
      where: { taskId: params.id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const { description } = await req.json();
    if (!description) return NextResponse.json({ error: "Description required" }, { status: 400 });

    const maxOrder = await prisma.shotItem.findFirst({
      where: { taskId: params.id },
      orderBy: { sortOrder: "desc" },
    });

    const item = await prisma.shotItem.create({
      data: { taskId: params.id, description, sortOrder: (maxOrder?.sortOrder ?? -1) + 1 },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const { itemId, completed } = await req.json();

    const item = await prisma.shotItem.update({
      where: { id: itemId },
      data: {
        completed,
        completedBy: completed ? session.username : null,
        completedAt: completed ? new Date() : null,
      },
    });
    return NextResponse.json({ item });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const { itemId } = await req.json();
    await prisma.shotItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
