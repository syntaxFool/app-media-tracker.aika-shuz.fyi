// GET  /api/tasks — List tasks (with filters)
// POST /api/tasks — Create task (any authenticated user)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { generateTaskId } from "@/lib/tasks";

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const influencer = searchParams.get("influencer");
    const service = searchParams.get("service");
    const gender = searchParams.get("gender");
    const createdAfter = searchParams.get("createdAfter");
    const createdBefore = searchParams.get("createdBefore");

    const where: any = {};

    // Active tasks: not terminal OR completed within last 24h
    const TERMINAL_STATUSES = ["Task Completed", "Dropped"];
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
      const searchFilter = {
        OR: [
          { id: { contains: search, mode: "insensitive" } },
          { customerName: { contains: search, mode: "insensitive" } },
          { note: { contains: search, mode: "insensitive" } },
          { seriesId: { contains: search, mode: "insensitive" } },
        ],
      };
      // Merge with existing active-task filter instead of overwriting
      if (where.OR) {
        where.AND = [{ OR: where.OR }, searchFilter];
        delete where.OR;
      } else {
        where.OR = searchFilter.OR;
      }
    }

    if (influencer === "true") where.isInfluencer = true;
    if (influencer === "false") where.isInfluencer = false;
    if (service) where.service = service;
    if (gender) where.gender = gender;
    const afterDate = toDateOrNull(createdAfter);
    const beforeDate = toDateOrNull(createdBefore);
    if (afterDate) where.createdAt = { ...(where.createdAt || {}), gte: afterDate };
    if (beforeDate) where.createdAt = { ...(where.createdAt || {}), lte: beforeDate };

    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      where,
    });

    // Attach series sibling info for tasks that belong to a series
    const seriesIds = Array.from(new Set(tasks.filter(t => t.seriesId).map(t => t.seriesId!)));
    if (seriesIds.length > 0) {
      const siblings = await prisma.task.findMany({
        where: { seriesId: { in: seriesIds } },
        select: { id: true, seriesId: true, status: true },
      });
      const seriesMap = new Map<string, { total: number; statuses: { id: string; status: string }[] }>();
      for (const sib of siblings) {
        if (!sib.seriesId) continue;
        if (!seriesMap.has(sib.seriesId)) {
          seriesMap.set(sib.seriesId, { total: 0, statuses: [] });
        }
        const entry = seriesMap.get(sib.seriesId)!;
        entry.total++;
        entry.statuses.push({ id: sib.id, status: sib.status });
      }
      for (const task of tasks) {
        if (task.seriesId) {
          const info = seriesMap.get(task.seriesId);
          if (info) {
            (task as any).seriesTotal = info.total;
            (task as any).seriesStatuses = info.statuses;
          }
        }
      }
    }

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

    const { customerName, shootDate, dueDate, service, gender, isInfluencer, note, photoPath, assignedTo, seriesId, partNumber } = body;

    // Series field validation
    if (partNumber != null && !seriesId) {
      return NextResponse.json(
        { error: "partNumber requires seriesId" },
        { status: 400 }
      );
    }
    if (partNumber != null && (typeof partNumber !== "number" || partNumber < 1)) {
      return NextResponse.json(
        { error: "partNumber must be a positive integer" },
        { status: 400 }
      );
    }
    // Auto-compute next part number if seriesId given but no partNumber
    let resolvedPartNumber = partNumber;
    if (seriesId && (partNumber === undefined || partNumber === null)) {
      const count = await prisma.task.count({ where: { seriesId } });
      resolvedPartNumber = count + 1;
    }

    // Required fields
    if (!customerName || !shootDate || !service || !gender) {
      return NextResponse.json(
        { error: "Missing required fields: customerName, shootDate, service, gender" },
        { status: 400 }
      );
    }
    // Photo is mandatory
    if (!photoPath) {
      return NextResponse.json(
        { error: "Photo is required" },
        { status: 400 }
      );
    }
    // Due date is required only for influencer tasks
    if (isInfluencer && !dueDate) {
      return NextResponse.json(
        { error: "Due date is required for influencer tasks" },
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

    // Retry loop: handle concurrent ID generation race
    let task;
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = await generateTaskId();
      try {
        task = await prisma.task.create({
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
        seriesId: seriesId || null,
        partNumber: resolvedPartNumber || null,
        assignedTo: (session.role === "su")
          ? (assignedTo || [])
          : ((assignedTo && assignedTo.length > 0) ? assignedTo : [session.username]),
        createdBy: session.username,
      },
    });
        break; // success
      } catch (createErr: any) {
        // P2002 = unique constraint violation — retry with next ID
        if (createErr.code === "P2002" && attempt < 4) continue;
        throw createErr; // other error or exhausted retries
      }
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message.includes("Forbidden")) return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
