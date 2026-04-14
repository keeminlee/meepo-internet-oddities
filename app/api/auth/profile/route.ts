import type { NextRequest } from "next/server";

import { fail, ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { updateProfile } from "@/lib/domain/users";

export async function PATCH(req: NextRequest) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();
  const body = (await req.json().catch(() => null)) as { display_name?: string } | null;
  if (!body || typeof body.display_name !== "string") {
    return fail("Display name must be 1-50 characters", 400);
  }
  const updated = updateProfile(user.id, { display_name: body.display_name });
  if (!updated) return fail("Display name must be 1-50 characters", 400);
  return ok({ ok: true, user: updated });
}
