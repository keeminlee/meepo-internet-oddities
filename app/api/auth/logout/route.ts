import type { NextRequest } from "next/server";

import { ok } from "@/lib/api/response";
import { SESSION_COOKIE, clearSessionCookie } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { destroySession } from "@/lib/domain/sessions";

export function POST(req: NextRequest) {
  ensureBootstrapped();
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (token) destroySession(token);
  const res = ok({ ok: true });
  clearSessionCookie(res);
  return res;
}
