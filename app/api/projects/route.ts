import type { NextRequest } from "next/server";

import { ok } from "@/lib/api/response";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { listProjects } from "@/lib/domain/projects";

export function GET(req: NextRequest) {
  ensureBootstrapped();
  const tag = req.nextUrl.searchParams.get("tag") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  return ok(listProjects({ tag, status }));
}
