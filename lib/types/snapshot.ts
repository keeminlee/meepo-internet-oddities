// Types for the Starstory living project pages feature (V1).
// Mirrors the DDL in lib/db/schema.ts — keep in sync when schema evolves.

/** Creator-reported lifecycle stage of a project. */
export type ProjectStatus = 'idea' | 'in progress' | 'on ice' | 'live' | 'archived';

/**
 * A versioned snapshot of a project's public-facing page.
 * Corresponds to the `project_snapshots` table.
 *
 * - `secondary_links` and `tags` are stored as JSON TEXT in SQLite;
 *   parse with JSON.parse before use.
 * - Boolean-like columns (`is_draft`) use SQLite INTEGER (0 | 1).
 * - Timestamps are ISO 8601 TEXT strings.
 */
export interface ProjectSnapshot {
  id: string;
  project_id: string;
  version_number: number;
  title: string | null;
  tagline: string | null;
  description: string | null;
  primary_url: string | null;
  /** JSON-encoded string[]. Parse before use. */
  secondary_links: string | null;
  /** JSON-encoded string[]. Parse before use. */
  tags: string | null;
  project_status: ProjectStatus | null;
  update_title: string | null;
  update_body: string | null;
  /** 0 = published, 1 = draft */
  is_draft: 0 | 1;
  created_at: string;
  published_at: string | null;
  updated_at: string;
}

/**
 * A screenshot slot (1–3) attached to a project snapshot.
 * Corresponds to the `snapshot_screenshots` table.
 */
export interface SnapshotScreenshot {
  id: string;
  snapshot_id: string;
  /** Slot position: 1, 2, or 3. Enforced by CHECK constraint in DB. */
  position: 1 | 2 | 3;
  url: string;
  alt_text: string;
  created_at: string;
}
