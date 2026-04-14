import type { NextRequest } from "next/server";

import { forbidden, ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { listPending } from "@/lib/domain/submissions";
import { isMeepoWriter } from "@/lib/domain/users";

export function GET(req: NextRequest) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();
  if (!isMeepoWriter(user.email)) return forbidden();
  return ok(listPending());
}
