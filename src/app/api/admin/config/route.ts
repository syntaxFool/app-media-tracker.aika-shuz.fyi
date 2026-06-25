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

    // Type-specific value validation
    if (key === "branding") {
      if (!value || !value.appName || !value.appFullName || !value.taskIdPrefix) {
        return NextResponse.json({
          error: "Branding requires appName, appFullName, and taskIdPrefix"
        }, { status: 400 });
      }
    }
    if (key === "services" || key === "genders" || key === "platforms") {
      if (!Array.isArray(value) || value.length === 0 || !value.every((v: any) => typeof v === "string")) {
        return NextResponse.json({
          error: `${key} must be a non-empty array of strings`
        }, { status: 400 });
      }
    }
    if (key === "status_responsible") {
      if (typeof value !== "object" || value === null || Array.isArray(value) || Object.keys(value).length === 0) {
        return NextResponse.json({
          error: "status_responsible must be a non-empty object"
        }, { status: 400 });
      }
      // Validate all values are strings
      if (!Object.values(value).every((v: any) => typeof v === "string")) {
        return NextResponse.json({
          error: "status_responsible values must be strings"
        }, { status: 400 });
      }
    }

    await setConfig(key as keyof AppConfigShape, value, session.username);
    return NextResponse.json({ success: true, key });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
