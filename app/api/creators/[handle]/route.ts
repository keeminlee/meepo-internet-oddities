import type { NextRequest } from "next/server";

import { notFound, ok } from "@/lib/api/response";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getCreatorByHandle } from "@/lib/domain/creators";
import { getDb } from "@/lib/db";
import { mapProject, type ProjectRow } from "@/lib/domain/types";

type RouteContext = { params: Promise<{ handle: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const { handle } = await ctx.params;
  const creator = getCreatorByHandle(handle);
  if (!creator) return notFound();

  const rows = getDb()
    .prepare<[string], ProjectRow>(
      "SELECT * FROM projects WHERE creator_id = ? AND approved = 1",
    )
    .all(creator.id);
  const projects = rows.map(mapProject).map((p) => ({ ...p, creator }));

  return ok({ ...creator, projects });
}
