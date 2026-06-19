// GET/PUT/DELETE /api/tasks/[id]
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { isValidTransition, getResponsibleForStatus } from "@/lib/tasks";
import { enqueueWhatsAppMessage } from "@/lib/whatsapp";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { customerName, shootDate, dueDate, service, gender, isInfluencer, note, photoPath, status, assignedTo } = body;

    const updateData: any = { updatedBy: session.username, updatedAt: new Date() };

    // Staff: ONLY status (forward only)
    if (session.role === "staff") {
      if (!status) return NextResponse.json({ error: "Status required" }, { status: 400 });
      if (!isValidTransition(task.status, status))
        return NextResponse.json({ error: `Cannot move from "${task.status}" to "${status}"` }, { status: 400 });

      updateData.status = status;
      const updated = await prisma.task.update({ where: { id: params.id }, data: updateData });

      await enqueueWhatsAppMessage({
        taskId: params.id, customerName: task.customerName,
        oldStatus: task.status, newStatus: status, updatedBy: session.username,
        nextResponsible: getResponsibleForStatus(status), type: "status_update",
      });
      await prisma.notification.create({
        data: { taskId: params.id, type: "status_update",
          message: `${session.username} moved ${params.id} from "${task.status}" to "${status}"` },
      });

      return NextResponse.json({ task: updated });
    }

    // Admin: full CRUD, bidirectional status
    if (customerName !== undefined) updateData.customerName = customerName;
    if (shootDate !== undefined) updateData.shootDate = new Date(shootDate);
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (service !== undefined) updateData.service = service;
    if (gender !== undefined) updateData.gender = gender;
    if (isInfluencer !== undefined) updateData.isInfluencer = isInfluencer;
    if (note !== undefined) updateData.note = note;
    if (photoPath !== undefined) updateData.photoPath = photoPath;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    if (status !== undefined && status !== task.status) {
      updateData.status = status;
      await enqueueWhatsAppMessage({
        taskId: params.id, customerName: task.customerName,
        oldStatus: task.status, newStatus: status, updatedBy: session.username,
        nextResponsible: getResponsibleForStatus(status), type: "status_update",
      });
      await prisma.notification.create({
        data: { taskId: params.id, type: "status_update",
          message: `${session.username} moved ${params.id} from "${task.status}" to "${status}"` },
      });
    }

    const updated = await prisma.task.update({ where: { id: params.id }, data: updateData });
    return NextResponse.json({ task: updated });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await prisma.task.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
