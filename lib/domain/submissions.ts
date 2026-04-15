import { randomUUID } from "node:crypto";

import { getDb } from "../db";

import { getProjectBySlugIncludingUnapproved } from "./projects";
import type { ProjectRow, ProjectWithCreator } from "./types";
import { mapProject } from "./types";

export interface SubmissionInput {
  name: string;
  one_line_pitch: string;
  external_url: string;
  repo_url?: string;
  /** Primary screenshot — stored in projects.screenshot_url for legacy cards. */
  screenshot_url: string;
  /** All screenshots for the initial v1 snapshot, ordered 1..N (max 3).
   *  When omitted, falls back to `[screenshot_url]`. */
  screenshot_urls?: string[];
  tags?: string[];
  why_i_made_this?: string;
}

export type SubmissionError =
  | "name_required"
  | "pitch_required"
  | "pitch_too_long"
  | "url_required"
  | "screenshot_required"
  | "meepo_tag_forbidden"
  | "slug_conflict";

export type SubmissionResult =
  | { ok: true; id: string; slug: string; auto_approved: boolean }
  | { ok: false; error: SubmissionError; status: number };

// Runtime switch: flip MIO_AUTO_APPROVE to "0" in /etc/mio/mio-web.env to
// require manual review for every submission again. Default is auto-approve.
function isAutoApproveEnabled(): boolean {
  const raw = process.env.MIO_AUTO_APPROVE?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export function createSubmission(
  userId: string,
  input: SubmissionInput,
  options: { isMeepoWriter: boolean },
): SubmissionResult {
  const name = input.name.trim();
  const one_line_pitch = input.one_line_pitch.trim();
  if (!name) return { ok: false, error: "name_required", status: 400 };
  if (!one_line_pitch)
    return { ok: false, error: "pitch_required", status: 400 };
  if (one_line_pitch.length > 150)
    return { ok: false, error: "pitch_too_long", status: 400 };
  const external_url = input.external_url.trim();
  const repo_url = (input.repo_url ?? "").trim();
  const screenshot_url = input.screenshot_url.trim();
  if (!external_url) return { ok: false, error: "url_required", status: 400 };
  if (!screenshot_url)
    return { ok: false, error: "screenshot_required", status: 400 };

  const tags = (input.tags ?? []).slice(0, 5);
  if (tags.includes("Meepo") && !options.isMeepoWriter) {
    return { ok: false, error: "meepo_tag_forbidden", status: 403 };
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const db = getDb();
  const clash = db
    .prepare<[string], { slug: string }>(
      "SELECT slug FROM projects WHERE slug = ?",
    )
    .get(slug);
  if (clash) return { ok: false, error: "slug_conflict", status: 409 };

  const id = randomUUID();
  const created_at = new Date().toISOString().split("T")[0];
  const autoApprove = isAutoApproveEnabled();
  const approved = autoApprove ? 1 : 0;

  // Normalize screenshot list: prefer explicit screenshot_urls, otherwise
  // fall back to the single screenshot_url. Cap at 3 (schema invariant).
  const screenshotUrls = (
    input.screenshot_urls && input.screenshot_urls.length > 0
      ? input.screenshot_urls
      : [screenshot_url]
  )
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 3);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO projects (
        id, creator_id, owner_user_id, slug, name, project_avatar_url, one_line_pitch,
        screenshot_url, external_url, repo_url, built_with, tags, source_type, status, clicks_sent,
        about, why_i_made_this, featured, approved, reviewed, is_demo, rejected, rejection_reason,
        rejected_at, rejected_by, created_at, updated_at, project_status
      ) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, '', ?, 'both', 'Live', 0, '', ?, 0, ?, 0, 0, 0, '', '', '', ?, '', 'in progress')`,
    ).run(
      id,
      userId,
      userId,
      slug,
      name,
      one_line_pitch,
      screenshotUrls[0] ?? screenshot_url,
      external_url,
      repo_url,
      JSON.stringify(tags),
      (input.why_i_made_this ?? "").trim().slice(0, 1000),
      approved,
      created_at,
    );
    db.prepare(
      "INSERT INTO submissions (project_id, user_id, submitted_at) VALUES (?, ?, ?)",
    ).run(id, userId, new Date().toISOString());

    // Eagerly seed v1 snapshot with ALL screenshots (up to 3). Lazy
    // ensureFirstSnapshot on first page view becomes a no-op (count > 0).
    const now = new Date().toISOString();
    const snapId = randomUUID();
    db.prepare(
      `INSERT INTO project_snapshots (
         id, project_id, version_number, title, tagline, description, primary_url,
         secondary_links, tags, project_status, update_title, update_body,
         is_draft, created_at, published_at, updated_at
       ) VALUES (?, ?, 1, ?, ?, '', ?, NULL, ?, 'in progress', NULL, NULL, 0, ?, ?, ?)`,
    ).run(snapId, id, name, one_line_pitch, external_url, JSON.stringify(tags), now, now, now);

    const ssStmt = db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES (?, ?, ?, ?, '', ?)`,
    );
    for (let i = 0; i < screenshotUrls.length; i++) {
      ssStmt.run(randomUUID(), snapId, i + 1, screenshotUrls[i], now);
    }
  });
  tx();

  return { ok: true, id, slug, auto_approved: autoApprove };
}

export function countPending(): number {
  const row = getDb()
    .prepare<[], { cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM projects WHERE reviewed = 0 AND rejected = 0",
    )
    .get();
  return row?.cnt ?? 0;
}

export function listPending(): ProjectWithCreator[] {
  const rows = getDb()
    .prepare<[], ProjectRow>(
      "SELECT * FROM projects WHERE reviewed = 0 AND rejected = 0 ORDER BY created_at DESC",
    )
    .all();
  return rows.map(mapProject).map((p) => {
    const full = getProjectBySlugIncludingUnapproved(p.slug);
    return full ?? { ...p, creator: null };
  });
}

export function approve(slug: string): boolean {
  const result = getDb()
    .prepare("UPDATE projects SET approved = 1, reviewed = 1 WHERE slug = ?")
    .run(slug);
  return result.changes > 0;
}

export function reject(
  slug: string,
  reviewerId: string,
  reason?: string,
): boolean {
  const result = getDb()
    .prepare(
      `UPDATE projects SET approved = 0, rejected = 1, reviewed = 1,
        rejection_reason = ?, rejected_at = ?, rejected_by = ?
       WHERE slug = ?`,
    )
    .run(
      (reason ?? "").trim().slice(0, 500),
      new Date().toISOString(),
      reviewerId,
      slug,
    );
  return result.changes > 0;
}
