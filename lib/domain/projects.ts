import { getDb } from "../db";

import { getCreatorById } from "./creators";
import { getUserById } from "./users";
import type { Project, ProjectRow, ProjectWithCreator } from "./types";
import { mapProject, userToCreatorShape } from "./types";

function resolveCreator(p: Project): ProjectWithCreator {
  let creator = getCreatorById(p.creator_id);
  if (!creator) {
    const user = getUserById(p.creator_id);
    if (user) creator = userToCreatorShape(user);
  }
  return { ...p, creator };
}

export interface ListFilter {
  tag?: string;
  status?: string;
}

export function listProjects(filter: ListFilter = {}): ProjectWithCreator[] {
  const rows = getDb()
    .prepare<[], ProjectRow>(
      "SELECT * FROM projects WHERE approved = 1 AND is_demo = 0",
    )
    .all();
  let projects = rows.map(mapProject);
  if (filter.tag) projects = projects.filter((p) => p.tags.includes(filter.tag!));
  if (filter.status) projects = projects.filter((p) => p.status === filter.status);
  return projects.map(resolveCreator);
}

export function getFeatured(): ProjectWithCreator[] {
  const rows = getDb()
    .prepare<[], ProjectRow>(
      "SELECT * FROM projects WHERE approved = 1 AND featured = 1 AND is_demo = 0",
    )
    .all();
  return rows.map(mapProject).map(resolveCreator);
}

export function getNewest(count = 6): ProjectWithCreator[] {
  const rows = getDb()
    .prepare<[number], ProjectRow>(
      `SELECT * FROM projects
       WHERE approved = 1 AND is_demo = 0
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(count);
  return rows.map(mapProject).map(resolveCreator);
}

export function getProjectBySlug(slug: string): ProjectWithCreator | null {
  const row = getDb()
    .prepare<[string], ProjectRow>(
      "SELECT * FROM projects WHERE slug = ? AND approved = 1",
    )
    .get(slug);
  return row ? resolveCreator(mapProject(row)) : null;
}

export function getProjectBySlugIncludingUnapproved(
  slug: string,
): ProjectWithCreator | null {
  const row = getDb()
    .prepare<[string], ProjectRow>("SELECT * FROM projects WHERE slug = ?")
    .get(slug);
  return row ? resolveCreator(mapProject(row)) : null;
}

export function trackClick(
  slug: string,
): { clicks_sent: number; external_url: string } | null {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE projects SET clicks_sent = clicks_sent + 1 WHERE slug = ?",
    )
    .run(slug);
  if (result.changes === 0) return null;
  const row = db
    .prepare<[string], { clicks_sent: number; external_url: string }>(
      "SELECT clicks_sent, external_url FROM projects WHERE slug = ?",
    )
    .get(slug);
  return row ?? null;
}

export function listProjectsByOwner(userId: string): ProjectWithCreator[] {
  const rows = getDb()
    .prepare<[string], ProjectRow>(
      "SELECT * FROM projects WHERE owner_user_id = ? ORDER BY created_at DESC",
    )
    .all(userId);
  return rows.map(mapProject).map(resolveCreator);
}

export interface ProjectPatch {
  name?: string;
  one_line_pitch?: string;
  external_url?: string;
  repo_url?: string;
  screenshot_url?: string;
  why_i_made_this?: string;
  tags?: string[];
}

export type UpdateResult =
  | { ok: true; project: ProjectWithCreator }
  | { ok: false; error: string; status: number };

export function updateProject(
  slug: string,
  ownerId: string,
  patch: ProjectPatch,
  options: { isMeepoWriter: boolean },
): UpdateResult {
  const db = getDb();
  const row = db
    .prepare<[string], ProjectRow>("SELECT * FROM projects WHERE slug = ?")
    .get(slug);
  if (!row) return { ok: false, error: "not_found", status: 404 };
  if (row.owner_user_id !== ownerId) {
    return { ok: false, error: "forbidden", status: 403 };
  }

  const current = mapProject(row);
  let name = current.name;
  let one_line_pitch = current.one_line_pitch;
  let external_url = current.external_url;
  let repo_url = current.repo_url;
  let screenshot_url = current.screenshot_url;
  let why_i_made_this = current.why_i_made_this;
  let tags = current.tags;

  if (patch.name !== undefined) {
    name = patch.name.trim();
    if (!name) return { ok: false, error: "name_empty", status: 400 };
  }
  if (patch.one_line_pitch !== undefined) {
    one_line_pitch = patch.one_line_pitch.trim();
    if (!one_line_pitch)
      return { ok: false, error: "pitch_empty", status: 400 };
    if (one_line_pitch.length > 150)
      return { ok: false, error: "pitch_too_long", status: 400 };
  }
  if (patch.external_url !== undefined) external_url = patch.external_url.trim();
  if (patch.repo_url !== undefined) repo_url = patch.repo_url.trim();
  if (patch.screenshot_url !== undefined)
    screenshot_url = patch.screenshot_url.trim();
  if (patch.why_i_made_this !== undefined)
    why_i_made_this = patch.why_i_made_this.trim().slice(0, 1000);
  if (patch.tags !== undefined) {
    tags = patch.tags.slice(0, 5);
    if (tags.includes("Meepo") && !options.isMeepoWriter) {
      return { ok: false, error: "meepo_tag_forbidden", status: 403 };
    }
  }

  if (!external_url) return { ok: false, error: "url_required", status: 400 };
  if (!screenshot_url)
    return { ok: false, error: "screenshot_required", status: 400 };

  const updated_at = new Date().toISOString();
  // Re-queue for review if this row was rejected.
  const resetRejection = current.rejected ? 1 : 0;

  db.prepare(
    `UPDATE projects SET
      name = ?, one_line_pitch = ?, external_url = ?, repo_url = ?, screenshot_url = ?,
      why_i_made_this = ?, tags = ?, source_type = 'both', updated_at = ?,
      rejected = CASE WHEN ? = 1 THEN 0 ELSE rejected END,
      rejection_reason = CASE WHEN ? = 1 THEN '' ELSE rejection_reason END,
      rejected_at = CASE WHEN ? = 1 THEN '' ELSE rejected_at END,
      rejected_by = CASE WHEN ? = 1 THEN '' ELSE rejected_by END,
      approved = CASE WHEN ? = 1 THEN 0 ELSE approved END
     WHERE slug = ? AND owner_user_id = ?`,
  ).run(
    name,
    one_line_pitch,
    external_url,
    repo_url,
    screenshot_url,
    why_i_made_this,
    JSON.stringify(tags),
    updated_at,
    resetRejection,
    resetRejection,
    resetRejection,
    resetRejection,
    resetRejection,
    slug,
    ownerId,
  );

  const final = getProjectBySlugIncludingUnapproved(slug);
  if (!final) return { ok: false, error: "lost", status: 500 };
  return { ok: true, project: final };
}
