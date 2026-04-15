// DELETE /api/projects/[slug]/snapshots/draft/screenshots/[id]
// PATCH  /api/projects/[slug]/snapshots/draft/screenshots/[id]
// Owner-only: remove or reorder/rename a screenshot on the current draft.

import type { NextRequest } from "next/server";

import { fail, forbidden, notFound, ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getDb } from "@/lib/db";
import { removeScreenshot, updateScreenshot } from "@/lib/domain/screenshots";

type RouteContext = { params: Promise<{ slug: string; id: string }> };

function getProjectBySlug(slug: string): { id: string; owner_user_id: string | null } | null {
  return (
    getDb()
      .prepare<[string], { id: string; owner_user_id: string | null }>(
        "SELECT id, owner_user_id FROM projects WHERE slug = ?",
      )
      .get(slug) ?? null
  );
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();

  const { slug, id } = await ctx.params;
  const project = getProjectBySlug(slug);
  if (!project) return notFound();
  if (project.owner_user_id !== user.id) return forbidden();

  const result = removeScreenshot(id, project.id);
  if (result.ok === false) {
    const code = result.code;
    if (code === "forbidden") {
      return forbidden("Screenshot does not belong to this project's draft");
    }
    return notFound("Screenshot not found");
  }

  return ok({ deleted: true });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();

  const { slug, id } = await ctx.params;
  const project = getProjectBySlug(slug);
  if (!project) return notFound();
  if (project.owner_user_id !== user.id) return forbidden();

  const body = (await req.json().catch(() => null)) as {
    position?: number;
    alt_text?: string;
  } | null;
  if (!body) return fail("Invalid JSON", 400);

  const fields: { position?: 1 | 2 | 3; alt_text?: string } = {};
  if (body.position !== undefined) {
    if (body.position !== 1 && body.position !== 2 && body.position !== 3) {
      return fail("position must be 1, 2, or 3", 400);
    }
    fields.position = body.position as 1 | 2 | 3;
  }
  if (body.alt_text !== undefined) {
    fields.alt_text = String(body.alt_text);
  }

  if (Object.keys(fields).length === 0) return fail("No updatable fields provided", 400);

  const result = updateScreenshot(id, project.id, fields);
  if (result.ok === false) {
    const code = result.code;
    if (code === "forbidden") {
      return forbidden("Screenshot does not belong to this project's draft");
    }
    if (code === "position_conflict") {
      return fail("Position conflict during reorder", 409);
    }
    return notFound("Screenshot not found");
  }

  return ok(result.screenshot);
}
