// POST /api/upload — Upload photo (multipart), auto-rotates via EXIF
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, HEIC allowed." }, { status: 400 });
    }

    // Validate size (max 5MB before compression, client should compress to ~1MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    // Ensure uploads directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Generate unique filename
    const ext = file.type.split("/")[1] || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Read buffer, auto-rotate based on EXIF orientation, strip metadata
    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await sharp(buffer)
      .rotate()      // auto-rotate via EXIF orientation tag
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    await writeFile(filepath, processed);

    return NextResponse.json({
      success: true,
      path: `/api/uploads/${filename}`,
      filename,
    });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
