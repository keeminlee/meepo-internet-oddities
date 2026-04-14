import type { NextRequest } from "next/server";

import { fail, ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { setHandle } from "@/lib/domain/users";

export async function POST(req: NextRequest) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();
  const body = (await req.json().catch(() => null)) as { handle?: string } | null;
  if (!body) return fail("Invalid JSON", 400);
  const result = setHandle(user.id, body.handle ?? "");
  if ("error" in result) {
    if (result.error === "taken") return fail("Handle already taken", 409);
    return fail(
      "Handle must be 3-20 characters, lowercase letters, numbers, and hyphens only",
      400,
    );
  }
  return ok({ ok: true, user: result.user });
}
