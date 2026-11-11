import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isDemoUser } from "@/lib/auth-helper";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  uploadToR2,
  deleteFromR2,
  isR2Configured,
  normalizeR2Folder,
} from "@/lib/r2";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "video/mp4",
  "video/webm",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per evidence photo/video

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);

    // 1. Rate Limiting: Max 20 media uploads per minute
    const rateLimitError = enforceRateLimit(
      req,
      currentUser.id,
      { limit: 20, windowMs: 60000 },
      "upload"
    );
    if (rateLimitError) return rateLimitError;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'file' field in formData" },
        { status: 400 }
      );
    }

    // 2. Validate MIME type (reject SVG & unsupported types)
    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: ${mimeType}. Allowed: JPEG, PNG, WEBP, GIF, HEIC, MP4, WEBM`,
        },
        { status: 400 }
      );
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Demo sandbox accounts never write to Cloudflare R2
    if (isDemoUser(currentUser) || !isR2Configured) {
      const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
      return NextResponse.json({
        success: true,
        data: {
          url: dataUrl,
          key: `demo_${Date.now()}`,
          size: buffer.length,
          contentType: mimeType,
        },
      });
    }

    const folder = normalizeR2Folder(formData.get("folder") as string);
    const originalName = (file as any).name || `${folder}.jpg`;

    const uploadResult = await uploadToR2(buffer, originalName, mimeType, folder);

    return NextResponse.json({
      success: true,
      data: uploadResult,
    });
  } catch (error: any) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to upload media to storage",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    if (isDemoUser(currentUser)) {
      return NextResponse.json({ success: true });
    }
    const { key, url } = await req.json();
    const deleted = await deleteFromR2(key || url || "");
    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete media" },
      { status: 500 }
    );
  }
}
