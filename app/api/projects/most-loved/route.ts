import type { NextRequest } from "next/server";

import { ok } from "@/lib/api/response";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getMostLoved } from "@/lib/domain/projects";

export function GET(req: NextRequest) {
  ensureBootstrapped();
  const count = Number(req.nextUrl.searchParams.get("count")) || 30;
  return ok(getMostLoved(count));
}
