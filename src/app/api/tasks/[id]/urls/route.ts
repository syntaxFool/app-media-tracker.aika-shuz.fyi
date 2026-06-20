// GET    /api/tasks/[id]/urls — List URLs
// POST   /api/tasks/[id]/urls — Add URL
// DELETE /api/tasks/[id]/urls — Remove URL
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const VALID_PLATFORMS = [
  "Instagram",
  "YouTube Shorts",
  "YouTube",
  "Snapchat",
  "Facebook",
  "Google Business Profile",
  "Custom",
] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const urls = await prisma.taskUrl.findMany({
      where: { taskId: params.id },
      orderBy: { id: "asc" },
    });
    return NextResponse.json({ urls });
  } catch (err: any) {
    if (err.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { platform, url, label } = await req.json();

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform" },
        { status: 400 }
      );
    }

    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const created = await prisma.taskUrl.create({
      data: {
        taskId: params.id,
        platform,
        url: url.trim(),
        label: platform === "Custom" ? (label || null) : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        taskId: params.id,
        actor: session.username,
        action: "field_update",
        detail: `Added ${platform} URL: ${url}`,
        metadata: { platform, url },
      },
    });

    return NextResponse.json({ url: created }, { status: 201 });
  } catch (err: any) {
    if (err.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { urlId } = await req.json();

    if (!urlId) {
      return NextResponse.json(
        { error: "urlId is required" },
        { status: 400 }
      );
    }

    await prisma.taskUrl.delete({ where: { id: urlId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
