import type { NextRequest } from "next/server";

import { ok } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { isMeepoWriter } from "@/lib/domain/users";

export function GET(req: NextRequest) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return ok({ authenticated: false });
  return ok({ authenticated: true, user, is_meepo_writer: isMeepoWriter(user.email) });
}
