// Counted-click mint logic. The single source of truth for the V0 meep economy
// rules (§3.1 + §10 of the spec). Every mint goes through `countedClick` and
// every constraint is checked here before writing.

import { randomUUID } from "node:crypto";

import { getDb } from "../db";

import {
  DAILY_CLICK_CAP,
  MEEPS_PER_CLICK_COSMIC,
  MEEPS_PER_MINT_PROJECT,
  MEEPS_PER_MINT_USER,
} from "./economy";

// Re-export so existing `@/lib/domain/meeps` consumers keep working.
export { DAILY_CLICK_CAP, MEEPS_PER_CLICK_COSMIC, MEEPS_PER_MINT_PROJECT, MEEPS_PER_MINT_USER };

export type CountedClickResult =
  | { kind: "not_found" }
  | { kind: "self_click" }
  | { kind: "daily_cap_reached"; daily_remaining: 0 }
  | {
      kind: "already_clicked";
      clicks_sent: number;
      external_url: string;
      daily_remaining: number;
      user_meep_balance: number;
    }
  | {
      kind: "minted";
      clicks_sent: number;
      external_url: string;
      daily_remaining: number;
      user_meep_balance: number;
    };

export interface CountedClickInput {
  userId: string;
  slug: string;
  /** Optional override for the per-user daily calendar day. Defaults to UTC today (YYYY-MM-DD). */
  today?: string;
}

export function countedClick(input: CountedClickInput): CountedClickResult {
  const db = getDb();
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  const project = db
    .prepare<[string], { id: string; owner_user_id: string | null; external_url: string }>(
      "SELECT id, owner_user_id, external_url FROM projects WHERE slug = ?",
    )
    .get(input.slug);
  if (!project) return { kind: "not_found" };

  if (project.owner_user_id && project.owner_user_id === input.userId) {
    return { kind: "self_click" };
  }

  const existing = db
    .prepare<[string, string, string], { id: string }>(
      "SELECT id FROM clicks WHERE user_id = ? AND project_id = ? AND clicked_at = ?",
    )
    .get(input.userId, project.id, today);

  const distinctCount = (
    db
      .prepare<[string, string], { count: number }>(
        "SELECT COUNT(DISTINCT project_id) AS count FROM clicks WHERE user_id = ? AND clicked_at = ?",
      )
      .get(input.userId, today) ?? { count: 0 }
  ).count;

  if (existing) {
    // Idempotent no-op — day's click for this project was already counted.
    // Always increment the raw clicks_sent view metric on every request so
    // "how many times was this link clicked" stays accurate.
    db.prepare("UPDATE projects SET clicks_sent = clicks_sent + 1 WHERE id = ?").run(project.id);
    const row = db
      .prepare<[string], { clicks_sent: number }>(
        "SELECT clicks_sent FROM projects WHERE id = ?",
      )
      .get(project.id);
    return {
      kind: "already_clicked",
      clicks_sent: row?.clicks_sent ?? 0,
      external_url: project.external_url,
      daily_remaining: Math.max(0, DAILY_CLICK_CAP - distinctCount),
      user_meep_balance: getMeepBalance(input.userId),
    };
  }

  if (distinctCount >= DAILY_CLICK_CAP) {
    // Still bump view metric so anonymous-style tracking remains consistent.
    db.prepare("UPDATE projects SET clicks_sent = clicks_sent + 1 WHERE id = ?").run(project.id);
    return { kind: "daily_cap_reached", daily_remaining: 0 };
  }

  // Mint: atomic transaction over clicks insert + three counters.
  const mintTx = db.transaction(() => {
    db.prepare(
      "INSERT INTO clicks (id, user_id, project_id, clicked_at) VALUES (?, ?, ?, ?)",
    ).run(randomUUID(), input.userId, project.id, today);
    db.prepare(
      `UPDATE projects SET clicks_sent = clicks_sent + 1, meep_count = meep_count + ${MEEPS_PER_MINT_PROJECT} WHERE id = ?`,
    ).run(project.id);
    db.prepare(`UPDATE users SET meep_balance = meep_balance + ${MEEPS_PER_MINT_USER} WHERE id = ?`).run(
      input.userId,
    );
    db.prepare(`UPDATE cosmic_state SET total_meeps = total_meeps + ${MEEPS_PER_CLICK_COSMIC} WHERE id = 1`).run();
  });
  mintTx();

  const row = db
    .prepare<[string], { clicks_sent: number }>("SELECT clicks_sent FROM projects WHERE id = ?")
    .get(project.id);

  return {
    kind: "minted",
    clicks_sent: row?.clicks_sent ?? 0,
    external_url: project.external_url,
    daily_remaining: Math.max(0, DAILY_CLICK_CAP - distinctCount - 1),
    user_meep_balance: getMeepBalance(input.userId),
  };
}

/** Current meep_balance for a user, or 0 if the user does not exist. */
export function getMeepBalance(userId: string): number {
  const row = getDb()
    .prepare<[string], { meep_balance: number }>(
      "SELECT meep_balance FROM users WHERE id = ?",
    )
    .get(userId);
  return row?.meep_balance ?? 0;
}

export function dailyRemaining(userId: string, today?: string): number {
  const day = today ?? new Date().toISOString().slice(0, 10);
  const row = getDb()
    .prepare<[string, string], { count: number }>(
      "SELECT COUNT(DISTINCT project_id) AS count FROM clicks WHERE user_id = ? AND clicked_at = ?",
    )
    .get(userId, day);
  return Math.max(0, DAILY_CLICK_CAP - (row?.count ?? 0));
}
