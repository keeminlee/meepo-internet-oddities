import type { NextRequest } from "next/server";

import { ok } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getMostLoved } from "@/lib/domain/projects";

export function GET(req: NextRequest) {
  ensureBootstrapped();
  const count = Number(req.nextUrl.searchParams.get("count")) || 30;
  const user = currentUser(req);
  return ok(getMostLoved(user?.id ?? null, count));
}
