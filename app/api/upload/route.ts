// Screenshot uploads. Destination directory is controlled by MIO_UPLOAD_DIR
// (see lib/uploads.ts). Default: <cwd>/data/uploads (gitignored).

import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextRequest } from "next/server";

import { created, fail, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE, uploadsDir } from "@/lib/uploads";

export async function POST(req: NextRequest) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();

  const form = await req.formData().catch(() => null);
  if (!form) return fail("Invalid multipart payload", 400);
  const file = form.get("screenshot");
  if (!(file instanceof File)) return fail("No screenshot file provided", 400);

  const ext = ALLOWED_UPLOAD_TYPES[file.type];
  if (!ext) return fail("Invalid file type. Allowed: PNG, JPEG, WebP", 400);
  if (file.size > MAX_UPLOAD_SIZE) return fail("File too large. Maximum 5MB", 400);

  const dir = uploadsDir();
  mkdirSync(dir, { recursive: true });
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(resolve(dir, filename), buffer);

  return created({ filename });
}
