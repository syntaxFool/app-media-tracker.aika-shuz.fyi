// POST /api/tasks/[id]/ping-admin — Trigger WhatsApp ping to admin
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { enqueueWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || `Incorrect status update on ${task.id}`;

    await enqueueWhatsAppMessage({
      taskId: params.id,
      customerName: task.customerName,
      oldStatus: task.status,
      newStatus: task.status,
      updatedBy: session.username,
      nextResponsible: "Admin",
      type: "ping_admin",
      requestedBy: session.username,
    });

    return NextResponse.json({ success: true, message: `Admin notified about task ${params.id}` });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
