import type { NextRequest } from "next/server";

import { ok } from "@/lib/api/response";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getNewest } from "@/lib/domain/projects";

export function GET(req: NextRequest) {
  ensureBootstrapped();
  const count = Number(req.nextUrl.searchParams.get("count")) || 6;
  return ok(getNewest(count));
}
