// Domain layer for project snapshots (Starstory living project pages V1).
// All DB access via better-sqlite3 synchronous API; no await needed.

import { getDb } from "../db";
import type { ProjectSnapshot, SnapshotScreenshot } from "../types/snapshot";

// ─── Row shapes ─────────────────────────────────────────────────────────────

interface SnapshotRow {
  id: string;
  project_id: string;
  version_number: number;
  title: string | null;
  tagline: string | null;
  description: string | null;
  primary_url: string | null;
  secondary_links: string | null;
  tags: string | null;
  project_status: string | null;
  update_title: string | null;
  update_body: string | null;
  is_draft: 0 | 1;
  created_at: string;
  published_at: string | null;
  updated_at: string;
}

interface ScreenshotRow {
  id: string;
  snapshot_id: string;
  position: 1 | 2 | 3;
  url: string;
  alt_text: string;
  created_at: string;
}

function mapSnapshot(row: SnapshotRow): ProjectSnapshot {
  return {
    id: row.id,
    project_id: row.project_id,
    version_number: row.version_number,
    title: row.title,
    tagline: row.tagline,
    description: row.description,
    primary_url: row.primary_url,
    secondary_links: row.secondary_links,
    tags: row.tags,
    project_status: row.project_status as ProjectSnapshot["project_status"],
    update_title: row.update_title,
    update_body: row.update_body,
    is_draft: row.is_draft,
    created_at: row.created_at,
    published_at: row.published_at,
    updated_at: row.updated_at,
  };
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

// ─── Queries ─────────────────────────────────────────────────────────────────

/** All published snapshots for a project, newest first. */
export function getSnapshots(projectId: string): ProjectSnapshot[] {
  const rows = getDb()
    .prepare<[string], SnapshotRow>(
      `SELECT * FROM project_snapshots
       WHERE project_id = ? AND is_draft = 0
       ORDER BY published_at DESC`,
    )
    .all(projectId);
  return rows.map(mapSnapshot);
}

/** Single published snapshot by version number (with screenshots). */
export function getSnapshot(
  projectId: string,
  version: number,
): (ProjectSnapshot & { screenshots: SnapshotScreenshot[] }) | null {
  const db = getDb();
  const row = db
    .prepare<[string, number], SnapshotRow>(
      `SELECT * FROM project_snapshots
       WHERE project_id = ? AND version_number = ? AND is_draft = 0`,
    )
    .get(projectId, version);
  if (!row) return null;
  const screenshots = getScreenshots(row.id);
  return { ...mapSnapshot(row), screenshots };
}

/** Latest published snapshot (highest version_number, non-draft). */
export function getLatestPublished(projectId: string): ProjectSnapshot | null {
  const row = getDb()
    .prepare<[string], SnapshotRow>(
      `SELECT * FROM project_snapshots
       WHERE project_id = ? AND is_draft = 0
       ORDER BY published_at DESC
       LIMIT 1`,
    )
    .get(projectId);
  return row ? mapSnapshot(row) : null;
}

/** Current draft for a project (at most one), or null. */
export function getDraft(
  projectId: string,
): (ProjectSnapshot & { screenshots: SnapshotScreenshot[] }) | null {
  const db = getDb();
  const row = db
    .prepare<[string], SnapshotRow>(
      `SELECT * FROM project_snapshots WHERE project_id = ? AND is_draft = 1`,
    )
    .get(projectId);
  if (!row) return null;
  const screenshots = getScreenshots(row.id);
  return { ...mapSnapshot(row), screenshots };
}

function getScreenshots(snapshotId: string): SnapshotScreenshot[] {
  const rows = getDb()
    .prepare<[string], ScreenshotRow>(
      `SELECT * FROM snapshot_screenshots WHERE snapshot_id = ? ORDER BY position`,
    )
    .all(snapshotId);
  return rows.map(mapScreenshot);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a draft by copying forward from the latest published snapshot.
 * Returns the new draft. Throws if a draft already exists (caller should 409).
 */
export function createDraft(projectId: string): ProjectSnapshot & { screenshots: SnapshotScreenshot[] } {
  const db = getDb();

  // Guard: no duplicate drafts.
  const existing = db
    .prepare<[string], { id: string }>(
      `SELECT id FROM project_snapshots WHERE project_id = ? AND is_draft = 1`,
    )
    .get(projectId);
  if (existing) {
    const err = new Error("draft_exists");
    (err as NodeJS.ErrnoException).code = "DRAFT_EXISTS";
    throw err;
  }

  // Ensure at least a v1 exists (migration-on-read).
  ensureFirstSnapshot(projectId);

  const source = db
    .prepare<[string], SnapshotRow>(
      `SELECT * FROM project_snapshots
       WHERE project_id = ? AND is_draft = 0
       ORDER BY published_at DESC
       LIMIT 1`,
    )
    .get(projectId);

  const now = new Date().toISOString();
  const draftId = crypto.randomUUID();

  const insertSnapshot = db.prepare(
    `INSERT INTO project_snapshots
      (id, project_id, version_number, title, tagline, description, primary_url,
       secondary_links, tags, project_status, update_title, update_body,
       is_draft, created_at, published_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 1, ?, NULL, ?)`,
  );

  const insertScreenshot = db.prepare(
    `INSERT INTO snapshot_screenshots
      (id, snapshot_id, position, url, alt_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  const run = db.transaction(() => {
    insertSnapshot.run(
      draftId,
      projectId,
      source?.title ?? null,
      source?.tagline ?? null,
      source?.description ?? null,
      source?.primary_url ?? null,
      source?.secondary_links ?? null,
      source?.tags ?? null,
      source?.project_status ?? null,
      now,
      now,
    );

    if (source) {
      const srcScreenshots = getScreenshots(source.id);
      for (const ss of srcScreenshots) {
        insertScreenshot.run(
          crypto.randomUUID(),
          draftId,
          ss.position,
          ss.url,
          ss.alt_text,
          now,
        );
      }
    }
  });
  run();

  return getDraft(projectId)!;
}

export interface DraftPatch {
  title?: string;
  tagline?: string;
  description?: string;
  primary_url?: string;
  secondary_links?: string[];
  tags?: string[];
  project_status?: string;
  update_title?: string;
  update_body?: string;
}

/** Update mutable fields on an existing draft row. */
export function updateDraft(draftId: string, fields: DraftPatch): ProjectSnapshot {
  const db = getDb();
  const now = new Date().toISOString();

  // Build SET clause dynamically for only supplied fields.
  const sets: string[] = ["updated_at = ?"];
  const values: unknown[] = [now];

  if (fields.title !== undefined) { sets.push("title = ?"); values.push(fields.title); }
  if (fields.tagline !== undefined) { sets.push("tagline = ?"); values.push(fields.tagline); }
  if (fields.description !== undefined) { sets.push("description = ?"); values.push(fields.description); }
  if (fields.primary_url !== undefined) { sets.push("primary_url = ?"); values.push(fields.primary_url); }
  if (fields.secondary_links !== undefined) { sets.push("secondary_links = ?"); values.push(JSON.stringify(fields.secondary_links)); }
  if (fields.tags !== undefined) { sets.push("tags = ?"); values.push(JSON.stringify(fields.tags)); }
  if (fields.project_status !== undefined) { sets.push("project_status = ?"); values.push(fields.project_status); }
  if (fields.update_title !== undefined) { sets.push("update_title = ?"); values.push(fields.update_title); }
  if (fields.update_body !== undefined) { sets.push("update_body = ?"); values.push(fields.update_body); }

  values.push(draftId);

  db.prepare(`UPDATE project_snapshots SET ${sets.join(", ")} WHERE id = ? AND is_draft = 1`).run(...values);

  const row = db
    .prepare<[string], SnapshotRow>(`SELECT * FROM project_snapshots WHERE id = ?`)
    .get(draftId);
  if (!row) throw new Error("draft_not_found_after_update");
  return mapSnapshot(row);
}

const THREE_DAYS_MS = 72 * 60 * 60 * 1000;

export type PublishResult =
  | { ok: true; snapshot: ProjectSnapshot }
  | { ok: false; code: "no_draft" | "rate_limited"; retry_after?: string };

/** Publish the current draft: assign version_number, set published_at, clear is_draft, write-through to projects. */
export function publishDraft(projectId: string): PublishResult {
  const db = getDb();

  // Check 3-day gap from last published snapshot.
  const lastPublished = db
    .prepare<[string], { published_at: string }>(
      `SELECT published_at FROM project_snapshots
       WHERE project_id = ? AND is_draft = 0
       ORDER BY published_at DESC LIMIT 1`,
    )
    .get(projectId);

  if (lastPublished?.published_at) {
    const lastMs = new Date(lastPublished.published_at).getTime();
    const nowMs = Date.now();
    if (nowMs - lastMs < THREE_DAYS_MS) {
      const retryAt = new Date(lastMs + THREE_DAYS_MS).toISOString();
      return { ok: false, code: "rate_limited", retry_after: retryAt };
    }
  }

  const draft = db
    .prepare<[string], SnapshotRow>(
      `SELECT * FROM project_snapshots WHERE project_id = ? AND is_draft = 1`,
    )
    .get(projectId);
  if (!draft) return { ok: false, code: "no_draft" };

  // Next version number = max published version + 1 (or 1 if none).
  const maxRow = db
    .prepare<[string], { max_v: number | null }>(
      `SELECT MAX(version_number) as max_v FROM project_snapshots
       WHERE project_id = ? AND is_draft = 0`,
    )
    .get(projectId);
  const nextVersion = (maxRow?.max_v ?? 0) + 1;
  const now = new Date().toISOString();

  // First screenshot url for write-through.
  const firstScreenshot = db
    .prepare<[string], { url: string }>(
      `SELECT url FROM snapshot_screenshots WHERE snapshot_id = ? ORDER BY position LIMIT 1`,
    )
    .get(draft.id);

  const run = db.transaction(() => {
    db.prepare(
      `UPDATE project_snapshots
       SET version_number = ?, published_at = ?, is_draft = 0, updated_at = ?
       WHERE id = ?`,
    ).run(nextVersion, now, now, draft.id);

    // Write-through to projects row.
    const sets: string[] = ["updated_at = ?"];
    const vals: unknown[] = [now];

    if (draft.title != null) { sets.push("name = ?"); vals.push(draft.title); }
    if (draft.tagline != null) { sets.push("one_line_pitch = ?"); vals.push(draft.tagline); }
    if (draft.description != null) { sets.push("about = ?"); vals.push(draft.description); }
    if (draft.primary_url != null) { sets.push("external_url = ?"); vals.push(draft.primary_url); }
    if (draft.tags != null) { sets.push("tags = ?"); vals.push(draft.tags); }
    if (draft.project_status != null) { sets.push("project_status = ?"); vals.push(draft.project_status); }
    if (firstScreenshot?.url) { sets.push("screenshot_url = ?"); vals.push(firstScreenshot.url); }

    vals.push(projectId);
    db.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  });
  run();

  const published = db
    .prepare<[string], SnapshotRow>(`SELECT * FROM project_snapshots WHERE id = ?`)
    .get(draft.id);
  return { ok: true, snapshot: mapSnapshot(published!) };
}

/** Delete the current draft (and its screenshots via FK cascade). Owner check is done by caller. */
export function deleteDraft(projectId: string): boolean {
  const db = getDb();
  const row = db
    .prepare<[string], { id: string }>(
      `SELECT id FROM project_snapshots WHERE project_id = ? AND is_draft = 1`,
    )
    .get(projectId);
  if (!row) return false;
  db.prepare(`DELETE FROM project_snapshots WHERE id = ?`).run(row.id);
  return true;
}

interface ProjectInfoRow {
  id: string;
  name: string;
  one_line_pitch: string;
  about: string;
  external_url: string;
  tags: string;
  project_status: string;
  screenshot_url: string;
  created_at: string;
}

/**
 * Migration-on-read: if a project has no snapshots at all, synthesize v1
 * from the projects row and mark it published.
 */
export function ensureFirstSnapshot(projectId: string): void {
  const db = getDb();
  const count = db
    .prepare<[string], { n: number }>(
      `SELECT COUNT(*) as n FROM project_snapshots WHERE project_id = ?`,
    )
    .get(projectId);
  if ((count?.n ?? 0) > 0) return;

  const proj = db
    .prepare<[string], ProjectInfoRow>(
      `SELECT id, name, one_line_pitch, about, external_url, tags, project_status, screenshot_url, created_at
       FROM projects WHERE id = ?`,
    )
    .get(projectId);
  if (!proj) return;

  const now = new Date().toISOString();
  const snapId = crypto.randomUUID();

  db.prepare(
    `INSERT INTO project_snapshots
      (id, project_id, version_number, title, tagline, description, primary_url,
       secondary_links, tags, project_status, update_title, update_body,
       is_draft, created_at, published_at, updated_at)
     VALUES (?, ?, 1, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, 0, ?, ?, ?)`,
  ).run(
    snapId,
    projectId,
    proj.name || null,
    proj.one_line_pitch || null,
    proj.about || null,
    proj.external_url || null,
    proj.tags || null,
    proj.project_status || null,
    proj.created_at,
    now,
    now,
  );

  if (proj.screenshot_url) {
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES (?, ?, 1, ?, '', ?)`,
    ).run(crypto.randomUUID(), snapId, proj.screenshot_url, now);
  }
}
