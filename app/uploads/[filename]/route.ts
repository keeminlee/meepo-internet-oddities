// Serves uploaded screenshots as static files. Sanitizes filename so it cannot
// escape the uploads directory.

import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { notFound } from "@/lib/api/response";

const SAFE_FILENAME = /^[a-f0-9-]+\.(png|jpg|webp)$/;
const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

function uploadsDir(): string {
  const env = process.env.MIO_UPLOADS_DIR?.trim();
  if (env) return resolve(env);
  return resolve(process.cwd(), "data", "uploads");
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ filename: string }> }) {
  const { filename } = await ctx.params;
  if (!SAFE_FILENAME.test(filename)) return notFound();
  const dir = uploadsDir();
  const target = resolve(dir, filename);
  if (!target.startsWith(dir) || !existsSync(target)) return notFound();
  const body = readFileSync(target);
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": MIME[extname(target)] ?? "application/octet-stream" },
  });
}
