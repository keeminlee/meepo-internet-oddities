import type { NextRequest } from "next/server";

import { ok } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { dailyRemaining, DAILY_CLICK_CAP } from "@/lib/domain/meeps";

export function GET(req: NextRequest) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return ok({ authenticated: false });

  const remaining = dailyRemaining(user.id);
  const used = DAILY_CLICK_CAP - remaining;

  return ok({
    authenticated: true,
    used,
    remaining,
    cap: DAILY_CLICK_CAP,
    handle: user.handle,
  });
}
