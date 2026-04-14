import type { NextRequest } from "next/server";

import { ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { listProjectsByOwner } from "@/lib/domain/projects";

export function GET(req: NextRequest) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();
  return ok(listProjectsByOwner(user.id));
}
