import type { NextRequest } from "next/server";

import { forbidden, notFound, ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { reject } from "@/lib/domain/submissions";
import { isMeepoWriter } from "@/lib/domain/users";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();
  if (!isMeepoWriter(user.email)) return forbidden();
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const changed = reject(slug, user.id, body.reason);
  if (!changed) return notFound();
  return ok({ ok: true, slug });
}
