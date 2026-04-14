import type { NextRequest } from "next/server";

import { fail, forbidden, notFound, ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import {
  deleteThreshold,
  updateThreshold,
  type UpdateThresholdInput,
} from "@/lib/domain/thresholds";
import { isMeepoWriter } from "@/lib/domain/users";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();
  if (!isMeepoWriter(user.email)) return forbidden();

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | {
        meep_target?: number;
        label?: string;
        feature_key?: string;
        unlocked?: boolean;
      }
    | null;
  if (!body) return fail("Invalid JSON", 400);

  const patch: UpdateThresholdInput = {};
  if (body.meep_target !== undefined) {
    const n = Number(body.meep_target);
    if (!Number.isFinite(n) || n < 0) return fail("meep_target must be non-negative", 400);
    patch.meep_target = n;
  }
  if (body.label !== undefined) patch.label = body.label.trim();
  if (body.feature_key !== undefined) patch.feature_key = body.feature_key.trim();
  if (body.unlocked !== undefined) patch.unlocked = !!body.unlocked;

  const updated = updateThreshold(id, patch);
  if (!updated) return notFound();
  return ok(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();
  if (!isMeepoWriter(user.email)) return forbidden();
  const { id } = await ctx.params;
  const removed = deleteThreshold(id);
  if (!removed) return notFound();
  return ok({ ok: true, id });
}
