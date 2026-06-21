// GET  /api/tasks — List tasks (with filters)
// POST /api/tasks — Create task (admin only)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { generateTaskId } from "@/lib/tasks";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const influencer = searchParams.get("influencer");
    const service = searchParams.get("service");
    const gender = searchParams.get("gender");

    const where: any = {};

    // Active tasks: not terminal OR completed within last 24h
    const TERMINAL_STATUSES = ["Task Completed"];
    if (!status) {
      where.OR = [
        { status: { notIn: TERMINAL_STATUSES } },
        {
          AND: [
            { status: { in: TERMINAL_STATUSES } },
            { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          ],
        },
      ];
    } else {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (influencer === "true") where.isInfluencer = true;
    if (influencer === "false") where.isInfluencer = false;
    if (service) where.service = service;
    if (gender) where.gender = gender;

    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      where,
    });

    return NextResponse.json({ tasks });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    const { customerName, shootDate, dueDate, service, gender, isInfluencer, note, photoPath, assignedTo } = body;

    if (!customerName || !shootDate || !dueDate || !service || !gender) {
      return NextResponse.json(
        { error: "Missing required fields: customerName, shootDate, dueDate, service, gender" },
        { status: 400 }
      );
    }

    // su must select at least one staff member
    if (session.role === "su" && (!assignedTo || assignedTo.length === 0)) {
      return NextResponse.json(
        { error: "Superuser must assign at least one staff member to the task" },
        { status: 400 }
      );
    }

    const id = await generateTaskId();

    const task = await prisma.task.create({
      data: {
        id,
        customerName,
        shootDate: new Date(shootDate),
        service,
        gender,
        isInfluencer: isInfluencer || false,
        photoPath: photoPath || null,
        note: note || null,
        dueDate: new Date(dueDate),
        assignedTo: (session.role === "su")
          ? (assignedTo || [])
          : ((assignedTo && assignedTo.length > 0) ? assignedTo : [session.username]),
        createdBy: session.username,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message.includes("Forbidden")) return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
