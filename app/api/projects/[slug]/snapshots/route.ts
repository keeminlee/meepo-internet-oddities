import type { NextRequest } from "next/server";

import { created, fail, notFound, ok, unauthorized, forbidden } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getDb } from "@/lib/db";
import {
  createDraft,
  ensureFirstSnapshot,
  getSnapshots,
} from "@/lib/domain/snapshots";

type RouteContext = { params: Promise<{ slug: string }> };

function getProjectBySlugRaw(slug: string): { id: string; owner_user_id: string | null } | null {
  return getDb()
    .prepare<[string], { id: string; owner_user_id: string | null }>(
      "SELECT id, owner_user_id FROM projects WHERE slug = ?",
    )
    .get(slug) ?? null;
}

/** GET /api/projects/[slug]/snapshots — list published snapshots, reverse chrono */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const { slug } = await ctx.params;
  const project = getProjectBySlugRaw(slug);
  if (!project) return notFound();
  ensureFirstSnapshot(project.id);
  const snapshots = getSnapshots(project.id);
  return ok(snapshots);
}

/** POST /api/projects/[slug]/snapshots — create draft via copy-forward; 409 if draft exists */
export async function POST(req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();

  const { slug } = await ctx.params;
  const project = getProjectBySlugRaw(slug);
  if (!project) return notFound();
  if (project.owner_user_id !== user.id) return forbidden();

  try {
    const draft = createDraft(project.id);
    return created(draft);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "DRAFT_EXISTS") {
      return fail("A draft already exists for this project", 409);
    }
    throw err;
  }
}
