// GET    /api/tasks/[id] — Get single task
// PUT    /api/tasks/[id] — Update task (admin: full, staff: status only)
// DELETE /api/tasks/[id] — Delete task (admin only)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { isValidTransition, getResponsibleForStatus } from "@/lib/tasks";
import { enqueueWhatsAppMessage } from "@/lib/whatsapp";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();

    // Staff can ONLY update status
    if (session.role === "staff") {
      const { status, dueDate } = body;

      if (!status) {
        return NextResponse.json({ error: "Staff can only update status" }, { status: 400 });
      }

      if (!isValidTransition(task.status, status)) {
        return NextResponse.json(
          { error: `Invalid status transition from "${task.status}" to "${status}"` },
          { status: 400 }
        );
      }

      const oldStatus = task.status;
      const updatedTask = await prisma.task.update({
        where: { id: params.id },
        data: {
          status,
          updatedBy: session.username,
          updatedAt: new Date(),
        },
      });

      // Enqueue WhatsApp notification
      const nextResponsible = getResponsibleForStatus(status);
      await enqueueWhatsAppMessage({
        taskId: params.id,
        customerName: task.customerName,
        oldStatus,
        newStatus: status,
        updatedBy: session.username,
        nextResponsible,
        type: "status_update",
      });

      // Create in-app notification
      await prisma.notification.create({
        data: {
          taskId: params.id,
          type: "status_update",
          message: `${session.username} moved ${params.id} from "${oldStatus}" to "${status}"`,
        },
      });

      return NextResponse.json({ task: updatedTask });
    }

    // Admin: full update
    const { customerName, shootDate, dueDate, service, gender, isInfluencer, note, photoPath, status } = body;

    const updateData: any = {
      updatedBy: session.username,
      updatedAt: new Date(),
    };

    if (customerName !== undefined) updateData.customerName = customerName;
    if (shootDate !== undefined) updateData.shootDate = new Date(shootDate);
    if (service !== undefined) updateData.service = service;
    if (gender !== undefined) updateData.gender = gender;
    if (isInfluencer !== undefined) updateData.isInfluencer = isInfluencer;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (photoPath !== undefined) updateData.photoPath = photoPath;

    // Admin can also update status
    if (status !== undefined) {
      if (status !== task.status && !isValidTransition(task.status, status)) {
        return NextResponse.json(
          { error: `Invalid status transition from "${task.status}" to "${status}"` },
          { status: 400 }
        );
      }
      updateData.status = status;

      // Enqueue WhatsApp notification for status change
      if (status !== task.status) {
        await enqueueWhatsAppMessage({
          taskId: params.id,
          customerName: task.customerName,
          oldStatus: task.status,
          newStatus: status,
          updatedBy: session.username,
          nextResponsible: getResponsibleForStatus(status),
          type: "status_update",
        });

        await prisma.notification.create({
          data: {
            taskId: params.id,
            type: "status_update",
            message: `${session.username} moved ${params.id} from "${task.status}" to "${status}"`,
          },
        });
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ task: updatedTask });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message.includes("Forbidden")) return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message.includes("Forbidden")) return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
