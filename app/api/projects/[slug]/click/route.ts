import type { NextRequest } from "next/server";

import { notFound, ok } from "@/lib/api/response";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { trackClick } from "@/lib/domain/projects";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  ensureBootstrapped();
  const { slug } = await ctx.params;
  const result = trackClick(slug);
  return result ? ok(result) : notFound();
}
