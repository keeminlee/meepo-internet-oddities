import type { NextRequest } from "next/server";

import { fail, notFound, ok } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getDb } from "@/lib/db";
import { countedClick, dailyRemaining } from "@/lib/domain/meeps";
import { trackClick } from "@/lib/domain/projects";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  ensureBootstrapped();
  const { slug } = await ctx.params;
  const user = currentUser(req);

  // Anonymous: preserve legacy behaviour (clicks_sent++, no meep mint).
  if (!user) {
    const result = trackClick(slug);
    if (!result) return notFound();
    return ok({ ...result, auth_required: true, meeps_minted: false });
  }

  const outcome = countedClick({ userId: user.id, slug });
  switch (outcome.kind) {
    case "not_found":
      return notFound();
    case "self_click":
      return fail("You can't earn meeps on your own project", 403);
    case "daily_cap_reached":
      return fail(
        "Daily click cap reached. Meeps reset at the top of the UTC day.",
        429,
      );
    case "already_clicked":
      return ok({
        clicks_sent: outcome.clicks_sent,
        external_url: outcome.external_url,
        meeps_minted: false,
        already_clicked: true,
        daily_remaining: outcome.daily_remaining,
        user_meep_balance: outcome.user_meep_balance,
      });
    case "minted": {
      // Fetch project name, slug, and author handle for the onboarding mint context.
      const mintMeta = getDb()
        .prepare<[string], { name: string; slug: string; creator_id: string }>(
          "SELECT p.name, p.slug, p.creator_id FROM projects p WHERE p.slug = ?",
        )
        .get(slug);
      const creatorHandle = mintMeta
        ? (
            getDb()
              .prepare<[string], { handle: string | null }>(
                "SELECT handle FROM creators WHERE id = ?",
              )
              .get(mintMeta.creator_id)?.handle ??
            getDb()
              .prepare<[string], { handle: string | null }>(
                "SELECT handle FROM users WHERE id = ?",
              )
              .get(mintMeta.creator_id)?.handle ??
            null
          )
        : null;
      return ok({
        clicks_sent: outcome.clicks_sent,
        external_url: outcome.external_url,
        meeps_minted: true,
        daily_remaining: outcome.daily_remaining,
        user_meep_balance: outcome.user_meep_balance,
        project_name: mintMeta?.name ?? null,
        project_slug: mintMeta?.slug ?? null,
        author_handle: creatorHandle,
      });
    }
    default: {
      // Exhaustive check
      const _never: never = outcome;
      return fail("Unknown outcome", 500);
    }
  }
}

// Unused import kept at the bottom so the discriminated result stays exhaustive-checked.
export { dailyRemaining };
