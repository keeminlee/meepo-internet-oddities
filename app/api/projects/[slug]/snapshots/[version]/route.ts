import type { NextRequest } from "next/server";

import { notFound, ok } from "@/lib/api/response";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getDb } from "@/lib/db";
import { ensureFirstSnapshot, getSnapshot } from "@/lib/domain/snapshots";

type RouteContext = { params: Promise<{ slug: string; version: string }> };

function getProjectBySlugRaw(slug: string): { id: string; owner_user_id: string | null } | null {
  return getDb()
    .prepare<[string], { id: string; owner_user_id: string | null }>(
      "SELECT id, owner_user_id FROM projects WHERE slug = ?",
    )
    .get(slug) ?? null;
}

/** GET /api/projects/[slug]/snapshots/[version] — single published snapshot with screenshots */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const { slug, version } = await ctx.params;
  const project = getProjectBySlugRaw(slug);
  if (!project) return notFound();

  const versionNum = parseInt(version, 10);
  if (isNaN(versionNum) || versionNum < 1) return notFound();

  ensureFirstSnapshot(project.id);
  const snapshot = getSnapshot(project.id, versionNum);
  return snapshot ? ok(snapshot) : notFound();
}
