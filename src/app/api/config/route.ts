// GET /api/config — Fetch all app config (any authenticated user)
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAllConfig } from "@/lib/config";

export async function GET() {
  try {
    await requireAuth();
    const configs = await getAllConfig();
    return NextResponse.json({ configs });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
