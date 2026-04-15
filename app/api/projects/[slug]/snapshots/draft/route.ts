import type { NextRequest } from "next/server";

import { fail, forbidden, notFound, ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getDb } from "@/lib/db";
import { getDraft, updateDraft, deleteDraft } from "@/lib/domain/snapshots";
import type { DraftPatch } from "@/lib/domain/snapshots";

type RouteContext = { params: Promise<{ slug: string }> };

function getProjectBySlugRaw(slug: string): { id: string; owner_user_id: string | null } | null {
  return getDb()
    .prepare<[string], { id: string; owner_user_id: string | null }>(
      "SELECT id, owner_user_id FROM projects WHERE slug = ?",
    )
    .get(slug) ?? null;
}

/** GET /api/projects/[slug]/snapshots/draft — current draft (404 if none) */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const { slug } = await ctx.params;
  const project = getProjectBySlugRaw(slug);
  if (!project) return notFound();
  const draft = getDraft(project.id);
  return draft ? ok(draft) : notFound("No draft exists for this project");
}

/** PATCH /api/projects/[slug]/snapshots/draft — update draft fields */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();

  const { slug } = await ctx.params;
  const project = getProjectBySlugRaw(slug);
  if (!project) return notFound();
  if (project.owner_user_id !== user.id) return forbidden();

  const draft = getDraft(project.id);
  if (!draft) return notFound("No draft exists for this project");

  const body = (await req.json().catch(() => null)) as DraftPatch | null;
  if (!body) return fail("Invalid JSON", 400);

  const updated = updateDraft(draft.id, body);
  return ok(updated);
}

/** DELETE /api/projects/[slug]/snapshots/draft — discard draft (owner-only) */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();

  const { slug } = await ctx.params;
  const project = getProjectBySlugRaw(slug);
  if (!project) return notFound();
  if (project.owner_user_id !== user.id) return forbidden();

  const deleted = deleteDraft(project.id);
  if (!deleted) return notFound("No draft exists for this project");
  return ok({ deleted: true });
}
