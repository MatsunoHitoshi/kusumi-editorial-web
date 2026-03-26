import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getSessionUser, requireRole } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const contentTypeSchema = z.enum(["page", "article", "project", "reading"]);

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function fileExtensionFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    requireRole(user, "editor");

    const formData = await request.formData();
    const rawType = formData.get("contentType");
    const file = formData.get("file");

    const contentType = contentTypeSchema.parse(rawType);
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!ACCEPTED_MIME.has(file.type)) {
      return NextResponse.json({ error: "unsupported mime type" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "file too large (max 8MB)" }, { status: 400 });
    }

    const now = new Date();
    const yyyy = now.getUTCFullYear().toString();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const ext = fileExtensionFromMime(file.type);
    const path = `${contentType}/${yyyy}/${mm}/${randomUUID()}.${ext}`;

    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false
      });
    if (uploadError) {
      return NextResponse.json({ error: "upload failed", detail: uploadError.message }, { status: 502 });
    }

    const { data } = supabaseAdmin.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid payload", issues: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "unexpected error" }, { status: 500 });
  }
}
