// Domain helpers for snapshot_screenshots (Starstory living project pages V1).
// All DB access via better-sqlite3 synchronous API; no await needed.

import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import type { SnapshotScreenshot } from "../types/snapshot";

interface ScreenshotRow {
  id: string;
  snapshot_id: string;
  position: 1 | 2 | 3;
  url: string;
  alt_text: string;
  created_at: string;
}

function mapScreenshot(row: ScreenshotRow): SnapshotScreenshot {
  return {
    id: row.id,
    snapshot_id: row.snapshot_id,
    position: row.position,
    url: row.url,
    alt_text: row.alt_text,
    created_at: row.created_at,
  };
}

export interface AddScreenshotOptions {
  url: string;
  alt_text?: string;
  /** If omitted, uses the next available slot 1-3. */
  position?: 1 | 2 | 3;
}

export type AddScreenshotResult =
  | { ok: true; screenshot: SnapshotScreenshot }
  | { ok: false; code: "max_reached" | "position_taken" | "snapshot_not_found" | "draft_not_found" };

// ─── Generic helpers (accept snapshotId directly) ────────────────────────────

/**
 * Add a screenshot to any snapshot by its ID.
 * Enforces max-3 limit and position 1-3 range.
 */
export function addScreenshotToSnapshot(
  snapshotId: string,
  opts: AddScreenshotOptions,
): AddScreenshotResult {
  const db = getDb();

  const snap = db
    .prepare<[string], { id: string }>(
      `SELECT id FROM project_snapshots WHERE id = ?`,
    )
    .get(snapshotId);
  if (!snap) return { ok: false, code: "snapshot_not_found" };

  const existing = db
    .prepare<[string], ScreenshotRow>(
      `SELECT * FROM snapshot_screenshots WHERE snapshot_id = ? ORDER BY position`,
    )
    .all(snapshotId);

  if (existing.length >= 3) return { ok: false, code: "max_reached" };

  let pos: 1 | 2 | 3;
  if (opts.position !== undefined) {
    if (existing.some((s) => s.position === opts.position)) {
      return { ok: false, code: "position_taken" };
    }
    pos = opts.position;
  } else {
    // Pick first free slot in 1-3.
    const taken = new Set(existing.map((s) => s.position));
    const free = ([1, 2, 3] as const).find((p) => !taken.has(p));
    if (!free) return { ok: false, code: "max_reached" };
    pos = free;
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  db.prepare(
    `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, snapshotId, pos, opts.url, opts.alt_text ?? "", now);

  const row = db
    .prepare<[string], ScreenshotRow>(`SELECT * FROM snapshot_screenshots WHERE id = ?`)
    .get(id)!;
  return { ok: true, screenshot: mapScreenshot(row) };
}

export type RemoveScreenshotOnSnapshotResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "forbidden" };

/**
 * Delete a screenshot by id. Verifies it belongs to the given snapshotId.
 */
export function removeScreenshotFromSnapshot(
  screenshotId: string,
  snapshotId: string,
): RemoveScreenshotOnSnapshotResult {
  const db = getDb();

  const row = db
    .prepare<[string], { id: string; snapshot_id: string }>(
      `SELECT id, snapshot_id FROM snapshot_screenshots WHERE id = ?`,
    )
    .get(screenshotId);

  if (!row) return { ok: false, code: "not_found" };
  if (row.snapshot_id !== snapshotId) return { ok: false, code: "forbidden" };

  db.prepare(`DELETE FROM snapshot_screenshots WHERE id = ?`).run(screenshotId);
  return { ok: true };
}

export type UpdateScreenshotOnSnapshotResult =
  | { ok: true; screenshot: SnapshotScreenshot }
  | { ok: false; code: "not_found" | "forbidden" | "position_conflict" };

/**
 * Update position and/or alt_text for a screenshot on a given snapshotId.
 * When reordering, uses a sentinel position (99) to avoid UNIQUE constraint
 * violations during the swap — moves the occupant aside first.
 */
export function updateScreenshotOnSnapshot(
  screenshotId: string,
  snapshotId: string,
  fields: { position?: 1 | 2 | 3; alt_text?: string },
): UpdateScreenshotOnSnapshotResult {
  const db = getDb();

  const row = db
    .prepare<[string], ScreenshotRow>(
      `SELECT * FROM snapshot_screenshots WHERE id = ?`,
    )
    .get(screenshotId);
  if (!row) return { ok: false, code: "not_found" };
  if (row.snapshot_id !== snapshotId) return { ok: false, code: "forbidden" };

  const run = db.transaction(() => {
    if (fields.position !== undefined && fields.position !== row.position) {
      // SQLite enforces UNIQUE(snapshot_id, position) per-row as updates occur,
      // so a direct two-update swap fails on the first step. Work around by
      // deleting the occupant row, moving the target, then re-inserting the occupant
      // at the vacated slot — all within the same transaction.
      const occupant = db
        .prepare<[string, number], ScreenshotRow>(
          `SELECT * FROM snapshot_screenshots WHERE snapshot_id = ? AND position = ?`,
        )
        .get(snapshotId, fields.position);

      if (occupant) {
        db.prepare(`DELETE FROM snapshot_screenshots WHERE id = ?`).run(occupant.id);
        db.prepare(`UPDATE snapshot_screenshots SET position = ? WHERE id = ?`).run(fields.position, screenshotId);
        db.prepare(
          `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(occupant.id, occupant.snapshot_id, row.position, occupant.url, occupant.alt_text, occupant.created_at);
      } else {
        db.prepare(`UPDATE snapshot_screenshots SET position = ? WHERE id = ?`).run(fields.position, screenshotId);
      }
    }
    if (fields.alt_text !== undefined) {
      db.prepare(
        `UPDATE snapshot_screenshots SET alt_text = ? WHERE id = ?`,
      ).run(fields.alt_text, screenshotId);
    }
  });
  run();

  const updated = db
    .prepare<[string], ScreenshotRow>(`SELECT * FROM snapshot_screenshots WHERE id = ?`)
    .get(screenshotId)!;
  return { ok: true, screenshot: mapScreenshot(updated) };
}

// ─── Project-draft-scoped wrappers (legacy API, kept for draft routes) ────────

/**
 * Add a screenshot to a draft snapshot belonging to projectId.
 * Enforces max-3 limit and position 1-3 range.
 */
export function addScreenshotToDraft(
  projectId: string,
  opts: AddScreenshotOptions,
): AddScreenshotResult {
  const db = getDb();

  const draft = db
    .prepare<[string], { id: string }>(
      `SELECT id FROM project_snapshots WHERE project_id = ? AND is_draft = 1`,
    )
    .get(projectId);
  if (!draft) return { ok: false, code: "draft_not_found" };

  return addScreenshotToSnapshot(draft.id, opts);
}

export type RemoveScreenshotResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "forbidden" };

/**
 * Delete a screenshot by id. Verifies it belongs to the draft of projectId.
 */
export function removeScreenshot(
  screenshotId: string,
  projectId: string,
): RemoveScreenshotResult {
  const db = getDb();

  const draft = db
    .prepare<[string], { id: string }>(
      `SELECT id FROM project_snapshots WHERE project_id = ? AND is_draft = 1`,
    )
    .get(projectId);
  if (!draft) return { ok: false, code: "not_found" };

  return removeScreenshotFromSnapshot(screenshotId, draft.id);
}

export type UpdateScreenshotResult =
  | { ok: true; screenshot: SnapshotScreenshot }
  | { ok: false; code: "not_found" | "forbidden" | "position_conflict" };

/**
 * Update position and/or alt_text for a screenshot.
 * When reordering, swaps any existing occupant of the target slot to keep positions unique.
 */
export function updateScreenshot(
  screenshotId: string,
  projectId: string,
  fields: { position?: 1 | 2 | 3; alt_text?: string },
): UpdateScreenshotResult {
  const db = getDb();

  const draft = db
    .prepare<[string], { id: string }>(
      `SELECT id FROM project_snapshots WHERE project_id = ? AND is_draft = 1`,
    )
    .get(projectId);
  if (!draft) return { ok: false, code: "not_found" };

  return updateScreenshotOnSnapshot(screenshotId, draft.id, fields);
}
