// POST /api/projects/[slug]/snapshots/draft/screenshots
// Upload a screenshot to the current draft snapshot (owner-only).

import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextRequest } from "next/server";

import { created, fail, forbidden, notFound, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getDb } from "@/lib/db";
import { addScreenshotToDraft } from "@/lib/domain/screenshots";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE, uploadsDir } from "@/lib/uploads";

type RouteContext = { params: Promise<{ slug: string }> };

function getProjectBySlug(slug: string): { id: string; owner_user_id: string | null } | null {
  return (
    getDb()
      .prepare<[string], { id: string; owner_user_id: string | null }>(
        "SELECT id, owner_user_id FROM projects WHERE slug = ?",
      )
      .get(slug) ?? null
  );
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();

  const { slug } = await ctx.params;
  const project = getProjectBySlug(slug);
  if (!project) return notFound();
  if (project.owner_user_id !== user.id) return forbidden();

  const form = await req.formData().catch(() => null);
  if (!form) return fail("Invalid multipart payload", 400);

  const file = form.get("screenshot");
  if (!(file instanceof File)) return fail("No screenshot file provided", 400);

  const ext = ALLOWED_UPLOAD_TYPES[file.type];
  if (!ext) return fail("Invalid file type. Allowed: PNG, JPEG, WebP", 400);
  if (file.size > MAX_UPLOAD_SIZE) return fail("File too large. Maximum 5MB", 400);

  const altText = typeof form.get("alt_text") === "string" ? (form.get("alt_text") as string) : "";
  const posRaw = form.get("position");
  let position: 1 | 2 | 3 | undefined;
  if (posRaw !== null) {
    const n = Number(posRaw);
    if (n !== 1 && n !== 2 && n !== 3) return fail("position must be 1, 2, or 3", 400);
    position = n as 1 | 2 | 3;
  }

  // Write file to disk.
  const dir = uploadsDir();
  mkdirSync(dir, { recursive: true });
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(resolve(dir, filename), buffer);

  // Build public URL: served via Next.js static file route at /api/uploads/[filename].
  const url = `/api/uploads/${filename}`;

  const result = addScreenshotToDraft(project.id, { url, alt_text: altText, position });

  if (result.ok === false) {
    const code = result.code;
    if (code === "max_reached") return fail("Max 3 screenshots per snapshot", 400);
    if (code === "position_taken") return fail("That position is already occupied", 409);
    return notFound("No draft exists for this project");
  }

  return created(result.screenshot);
}
