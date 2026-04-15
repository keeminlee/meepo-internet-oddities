import type { NextRequest } from "next/server";

import { fail, forbidden, notFound, ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getDb } from "@/lib/db";
import { publishDraft } from "@/lib/domain/snapshots";

type RouteContext = { params: Promise<{ slug: string }> };

function getProjectBySlugRaw(slug: string): { id: string; owner_user_id: string | null } | null {
  return getDb()
    .prepare<[string], { id: string; owner_user_id: string | null }>(
      "SELECT id, owner_user_id FROM projects WHERE slug = ?",
    )
    .get(slug) ?? null;
}

/**
 * POST /api/projects/[slug]/snapshots/draft/publish
 * Assigns version_number (max+1), sets published_at, clears is_draft.
 * Enforces 3-day gap — returns 429 with {retry_after: ISO} if < 72 h since last publish.
 * Writes through to projects row: title→name, tagline→one_line_pitch,
 * description→about, primary_url→external_url, project_status, screenshot_url, updated_at.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();

  const { slug } = await ctx.params;
  const project = getProjectBySlugRaw(slug);
  if (!project) return notFound();
  if (project.owner_user_id !== user.id) return forbidden();

  const result = publishDraft(project.id);

  if (result.ok === false) {
    if (result.code === "no_draft") {
      return notFound("No draft exists to publish");
    }
    // rate_limited
    return fail(
      `Published too recently. Retry after ${result.retry_after}`,
      429,
    );
  }

  return ok(result.snapshot);
}
