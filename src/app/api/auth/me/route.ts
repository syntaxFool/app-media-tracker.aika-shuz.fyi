// GET /api/auth/me — Get current user
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, role: true, displayName: true, isSuperuser: true },
  });

  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      role: session.role,
      displayName: dbUser?.displayName || session.username,
    },
  });
}
