// GET  /api/admin/config — fetch all config (SU only)
// PUT  /api/admin/config — upsert a config key (SU only)
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAllConfig, setConfig, AppConfigShape } from "@/lib/config";

export async function GET() {
  try {
    const session = await requireAuth();
    if (session.role !== "su") {
      return NextResponse.json({ error: "Superuser access required" }, { status: 403 });
    }
    const configs = await getAllConfig();
    return NextResponse.json({ configs });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "su") {
      return NextResponse.json({ error: "Superuser access required" }, { status: 403 });
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }

    // Validate key is one of the known config keys
    const validKeys: (keyof AppConfigShape)[] = ["services", "genders", "platforms", "branding", "status_responsible"];
    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: `Invalid config key: ${key}` }, { status: 400 });
    }

    await setConfig(key as keyof AppConfigShape, value, session.username);
    return NextResponse.json({ success: true, key });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
