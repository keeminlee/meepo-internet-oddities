// Dev-only: override the current user's meep_balance for onboarding testing.
// Refuses in any non-development NODE_ENV. Does not touch cosmic_state or any
// other economy counters — this is a debug handle, not a general admin tool.

import type { NextRequest } from "next/server";

import { fail, notFound, ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") return notFound();

  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => null)) as { balance?: unknown } | null;
  const balance = Number(body?.balance);
  if (!Number.isFinite(balance) || balance < 0 || balance > 100_000 || !Number.isInteger(balance)) {
    return fail("balance must be a non-negative integer", 400);
  }

  getDb()
    .prepare("UPDATE users SET meep_balance = ? WHERE id = ?")
    .run(balance, user.id);

  return ok({ user_meep_balance: balance });
}
