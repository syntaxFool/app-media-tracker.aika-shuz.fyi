// GET /api/users — List users (admin only)
// POST /api/users — Create user (admin only)
// PUT /api/users — Change password (admin only)
// DELETE /api/users — Delete user (admin only, not superuser)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin, requireNotSuperuser, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, isSuperuser: true, createdAt: true },
      orderBy: { id: "asc" },
    });
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message.includes("Unauthorized") ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { username, password, role } = await req.json();
    if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return NextResponse.json({ error: "Username exists" }, { status: 409 });

    const user = await prisma.user.create({
      data: { username, password: await hashPassword(password), role: role || "staff" },
      select: { id: true, username: true, role: true, isSuperuser: true, createdAt: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });

    // Superuser check
    await requireNotSuperuser(username);

    const existing = await prisma.user.findUnique({ where: { username }, select: { username: true } });
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.user.update({
      where: { username },
      data: { password: await hashPassword(password) },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "Cannot modify superuser") return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

    await requireNotSuperuser(username);

    const existing = await prisma.user.findUnique({ where: { username }, select: { username: true } });
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.user.delete({ where: { username } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "Cannot modify superuser") return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
