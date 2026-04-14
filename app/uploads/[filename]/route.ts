// Serves uploaded screenshots from the durable MIO_UPLOAD_DIR path (see
// lib/uploads.ts). Sanitizes the filename so it cannot escape the uploads dir.

import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { notFound } from "@/lib/api/response";
import { SAFE_UPLOAD_FILENAME, UPLOAD_MIME, uploadsDir } from "@/lib/uploads";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ filename: string }> }) {
  const { filename } = await ctx.params;
  if (!SAFE_UPLOAD_FILENAME.test(filename)) return notFound();
  const dir = uploadsDir();
  const target = resolve(dir, filename);
  if (!target.startsWith(dir) || !existsSync(target)) return notFound();
  const body = readFileSync(target);
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": UPLOAD_MIME[extname(target)] ?? "application/octet-stream" },
  });
}
