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
  screenshot_url: string;
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
  | { ok: true; id: string; slug: string }
  | { ok: false; error: SubmissionError; status: number };

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
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO projects (
        id, creator_id, owner_user_id, slug, name, project_avatar_url, one_line_pitch,
        screenshot_url, external_url, repo_url, built_with, tags, source_type, status, clicks_sent,
        about, why_i_made_this, featured, approved, is_demo, rejected, rejection_reason,
        rejected_at, rejected_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, '', ?, 'both', 'Live', 0, '', ?, 0, 0, 0, 0, '', '', '', ?, '')`,
    ).run(
      id,
      userId,
      userId,
      slug,
      name,
      one_line_pitch,
      screenshot_url,
      external_url,
      repo_url,
      JSON.stringify(tags),
      (input.why_i_made_this ?? "").trim().slice(0, 1000),
      created_at,
    );
    db.prepare(
      "INSERT INTO submissions (project_id, user_id, submitted_at) VALUES (?, ?, ?)",
    ).run(id, userId, new Date().toISOString());
  });
  tx();

  return { ok: true, id, slug };
}

export function listPending(): ProjectWithCreator[] {
  const rows = getDb()
    .prepare<[], ProjectRow>(
      "SELECT * FROM projects WHERE approved = 0 AND rejected = 0 ORDER BY created_at DESC",
    )
    .all();
  return rows.map(mapProject).map((p) => {
    const full = getProjectBySlugIncludingUnapproved(p.slug);
    return full ?? { ...p, creator: null };
  });
}

export function approve(slug: string): boolean {
  const result = getDb()
    .prepare("UPDATE projects SET approved = 1 WHERE slug = ?")
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
      `UPDATE projects SET rejected = 1, rejection_reason = ?, rejected_at = ?, rejected_by = ?
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
