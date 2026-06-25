// GET  /api/tasks/[id]/comments — List comments
// POST /api/tasks/[id]/comments — Add comment
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendPushNotifications } from "@/lib/push";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const comments = await prisma.comment.findMany({
      where: { taskId: params.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ comments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: "Text required" }, { status: 400 });

    // Verify task exists
    const taskExists = await prisma.task.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!taskExists) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const comment = await prisma.comment.create({
      data: { taskId: params.id, author: session.username, text },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        taskId: params.id,
        type: "comment",
        message: `${session.username} commented on ${params.id}`,
      },
    });
    sendPushNotifications(params.id, `${session.username} commented on ${params.id}`);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
