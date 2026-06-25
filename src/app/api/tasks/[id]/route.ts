// GET/PUT/DELETE /api/tasks/[id]
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { getResponsibleForStatus, getAllowedNextStatuses } from "@/lib/tasks";
import { enqueueWhatsAppMessage } from "@/lib/whatsapp";
import { sendPushNotifications } from "@/lib/push";

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
    const { customerName, shootDate, dueDate, service, gender, isInfluencer, note, photoPath, status, assignedTo, seriesId, partNumber } = body;

    // Helper: creates an ActivityLog promise (for use inside prisma.$transaction)
    const logActivity = (actor: string, action: string, detail: string, metadata?: any) =>
      prisma.activityLog.create({
        data: { taskId: params.id, actor, action, detail, metadata },
      });

    const updateData: any = { updatedBy: session.username, updatedAt: new Date() };

    // Staff: ONLY status (forward only) — must be assigned
    if (session.role === "staff") {
      const assigned = Array.isArray(task.assignedTo) ? task.assignedTo as string[] : [];
      if (!assigned.includes(session.username)) {
        return NextResponse.json({ error: "You are not assigned to this task" }, { status: 403 });
      }

      if (!status) return NextResponse.json({ error: "Status required" }, { status: 400 });
      const allowedStatuses = getAllowedNextStatuses(task, session.role);
      if (!allowedStatuses.includes(status))
        return NextResponse.json({ error: `Cannot move from "${task.status}" to "${status}"` }, { status: 400 });

      updateData.status = status;

      // If moving from Data Copied → Reviewed on a rejected task, clear rejection fields
      if (status === "Reviewed" && task.status === "Data Copied" && task.rejectionNote) {
        updateData.rejectionNote = null;
        updateData.rejectedBy = null;
        updateData.rejectedAt = null;
      }

      // Transaction: task update + activity log are atomic
      const [updated] = await prisma.$transaction([
        prisma.task.update({ where: { id: params.id }, data: updateData }),
        logActivity(session.username, "status_change",
          `Status: ${task.status} → ${status}`,
          { oldStatus: task.status, newStatus: status }),
      ]);

      await enqueueWhatsAppMessage({
        taskId: params.id, customerName: task.customerName,
        oldStatus: task.status, newStatus: status, updatedBy: session.username,
        nextResponsible: getResponsibleForStatus(status), type: "status_update",
      });
      await prisma.notification.create({
        data: { taskId: params.id, type: "status_update",
          message: `${session.username} moved ${params.id} from "${task.status}" to "${status}"` },
      });
      sendPushNotifications(params.id, `${session.username} moved ${params.id} from "${task.status}" to "${status}"`);

      return NextResponse.json({ task: updated });
    }

    // Admin: full CRUD, bidirectional status

    // Validate rejection note before any side effects
    const isRejection = status !== undefined && status !== task.status && task.status === "Reviewed" && (status === "Data Copied" || status === "Dropped");
    if (isRejection) {
      if (!body.rejectionNote || !body.rejectionNote.trim()) {
        return NextResponse.json(
          { error: "Rejection note is required when moving from Reviewed" },
          { status: 400 }
        );
      }
    }

    // Validate dates before using them
    const parsedShootDate = shootDate !== undefined ? new Date(shootDate) : undefined;
    if (shootDate !== undefined && isNaN(parsedShootDate!.getTime())) {
      return NextResponse.json({ error: "Invalid shootDate" }, { status: 400 });
    }
    const parsedDueDate = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined;
    if (dueDate !== undefined && dueDate !== null && isNaN(new Date(dueDate).getTime())) {
      return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
    }

    if (customerName !== undefined) updateData.customerName = customerName;
    if (parsedShootDate !== undefined) updateData.shootDate = parsedShootDate;
    if (parsedDueDate !== undefined) updateData.dueDate = parsedDueDate;
    if (service !== undefined) updateData.service = service;
    if (gender !== undefined) updateData.gender = gender;
    if (isInfluencer !== undefined) updateData.isInfluencer = isInfluencer;
    if (note !== undefined) updateData.note = note;
    if (photoPath !== undefined) updateData.photoPath = photoPath;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (seriesId !== undefined) updateData.seriesId = seriesId || null;
    if (partNumber !== undefined) updateData.partNumber = partNumber;

    const statusChanged = status !== undefined && status !== task.status;
    if (statusChanged) {
      updateData.status = status;
      // If rejection: save rejection fields
      if (task.status === "Reviewed" && (status === "Data Copied" || status === "Dropped")) {
        updateData.rejectionNote = body.rejectionNote;
        updateData.rejectedBy = session.username;
        updateData.rejectedAt = new Date();
      }
    }

    // Always detect field-level changes (regardless of status change)
    const changedFields: string[] = [];
    if (customerName !== undefined && customerName !== task.customerName) changedFields.push("customerName");
    if (service !== undefined && service !== task.service) changedFields.push("service");
    if (gender !== undefined && gender !== task.gender) changedFields.push("gender");
    if (isInfluencer !== undefined && isInfluencer !== task.isInfluencer) changedFields.push("isInfluencer");
    if (note !== undefined && note !== task.note) changedFields.push("note");
    if (shootDate !== undefined) {
      const newVal = shootDate ? new Date(shootDate).toISOString() : null;
      const oldVal = task.shootDate ? new Date(task.shootDate).toISOString() : null;
      if (newVal !== oldVal) changedFields.push("shootDate");
    }
    if (dueDate !== undefined) {
      const newVal = dueDate ? new Date(dueDate).toISOString() : null;
      const oldVal = task.dueDate ? new Date(task.dueDate).toISOString() : null;
      if (newVal !== oldVal) changedFields.push("dueDate");
    }
    if (assignedTo !== undefined && JSON.stringify(assignedTo) !== JSON.stringify(task.assignedTo)) {
      changedFields.push("assignedTo");
    }
    if (seriesId !== undefined && seriesId !== task.seriesId) changedFields.push("seriesId");
    if (partNumber !== undefined && partNumber !== task.partNumber) changedFields.push("partNumber");

    // Detect photo change separately for dedicated action types
    const photoChanged = photoPath !== undefined && photoPath !== task.photoPath;

    // Build transaction: task update + all applicable activity logs
    const transactionOps: any[] = [
      prisma.task.update({ where: { id: params.id }, data: updateData }),
    ];

    // Status change log
    if (statusChanged) {
      transactionOps.push(logActivity(session.username, "status_change",
        `Status: ${task.status} → ${status}`,
        { oldStatus: task.status, newStatus: status }));
    }

    // Photo-only change (no other fields, no status change) → dedicated action
    if (photoChanged && changedFields.length === 0 && !statusChanged) {
      transactionOps.push(logActivity(session.username,
        photoPath ? "photo_added" : "photo_removed",
        photoPath ? "Photo added" : "Photo removed"));
    } else if (photoChanged) {
      // Photo changed alongside other field or status changes — include in field list
      changedFields.push("photoPath");
    }

    // Field update log
    if (changedFields.length > 0) {
      transactionOps.push(logActivity(session.username, "field_update",
        `Updated: ${changedFields.join(", ")}`,
        { fields: changedFields }));
    }

    // Push notification inside transaction so it's atomic with the status change
    const notificationMsg = statusChanged
      ? `${session.username} moved ${params.id} from "${task.status}" to "${status}"`
      : null;
    if (notificationMsg) {
      transactionOps.push(
        prisma.notification.create({
          data: { taskId: params.id, type: "status_update", message: notificationMsg },
        })
      );
    }

    const [updated] = await prisma.$transaction(transactionOps);

    // Non-DB side effects after successful transaction
    if (statusChanged) {
      await enqueueWhatsAppMessage({
        taskId: params.id, customerName: task.customerName,
        oldStatus: task.status, newStatus: status, updatedBy: session.username,
        nextResponsible: getResponsibleForStatus(status), type: "status_update",
      });
      sendPushNotifications(params.id, notificationMsg!);
    }

    return NextResponse.json({ task: updated });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const existing = await prisma.task.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    await prisma.task.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
