import type { NextRequest } from "next/server";

import { created, fail, forbidden, ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { createThreshold, listAllThresholds } from "@/lib/domain/thresholds";
import { isMeepoWriter } from "@/lib/domain/users";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();
  if (!isMeepoWriter(user.email)) return forbidden();
  return ok(listAllThresholds());
}

export async function POST(req: NextRequest) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();
  if (!isMeepoWriter(user.email)) return forbidden();

  const body = (await req.json().catch(() => null)) as
    | { meep_target?: number; label?: string; feature_key?: string }
    | null;
  if (!body) return fail("Invalid JSON", 400);

  const meep_target = Number(body.meep_target);
  if (!Number.isFinite(meep_target) || meep_target < 0) {
    return fail("meep_target must be a non-negative number", 400);
  }
  const label = (body.label ?? "").trim();
  if (!label) return fail("label is required", 400);
  const feature_key = (body.feature_key ?? "").trim();
  if (!feature_key) return fail("feature_key is required", 400);

  return created(createThreshold({ meep_target, label, feature_key }));
}
