// SQLite schema definitions for MIO.
//
// Storage decisions:
// - tags[] on projects: stored as JSON TEXT column. Rationale: always read/written as
//   full list with the project; filtering ("has tag X") is server-side JSON scan over
//   a 16-row table. A join table (project_tags) was considered and rejected as premature
//   normalization for the current scale; can be revisited if filter volume grows.
// - links{} on creators: stored as JSON TEXT column. Rationale: opaque key/value map
//   (x, github, website, ...) with no queries by link — only read as a whole.
// - Timestamps: stored as TEXT (ISO 8601) to round-trip exactly with the existing
//   db.json values; no date arithmetic is needed at the persistence layer.
// - IDs: TEXT to preserve legacy ids like "creator-1", "user-604ce78f", UUIDs.

export const SCHEMA_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS creators (
    id TEXT PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    creative_thesis TEXT NOT NULL DEFAULT '',
    links TEXT NOT NULL DEFAULT '{}'
  )`,

  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    github_id INTEGER UNIQUE NOT NULL,
    handle TEXT UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    owner_user_id TEXT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    project_avatar_url TEXT NOT NULL DEFAULT '',
    one_line_pitch TEXT NOT NULL DEFAULT '',
    screenshot_url TEXT NOT NULL DEFAULT '',
    external_url TEXT NOT NULL DEFAULT '',
    repo_url TEXT NOT NULL DEFAULT '',
    built_with TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    source_type TEXT NOT NULL DEFAULT 'both',
    status TEXT NOT NULL DEFAULT 'Live',
    clicks_sent INTEGER NOT NULL DEFAULT 0,
    about TEXT NOT NULL DEFAULT '',
    why_i_made_this TEXT NOT NULL DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0,
    approved INTEGER NOT NULL DEFAULT 0,
    is_demo INTEGER NOT NULL DEFAULT 0,
    rejected INTEGER NOT NULL DEFAULT 0,
    rejection_reason TEXT NOT NULL DEFAULT '',
    rejected_at TEXT NOT NULL DEFAULT '',
    rejected_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT ''
  )`,

  `CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    submitted_at TEXT NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_projects_creator_id ON projects(creator_id)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_owner_user_id ON projects(owner_user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_approved ON projects(approved)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
];

// Column additions applied after SCHEMA_DDL. Each entry adds a column to an
// existing table only if it is not already present — SQLite has no
// `ALTER TABLE ADD COLUMN IF NOT EXISTS`, so runMigrations() inspects
// `PRAGMA table_info` to stay idempotent.
export interface ColumnAddition {
  table: string;
  column: string;
  // Full column definition appended after `ADD COLUMN ${column} `.
  definition: string;
}

export const COLUMN_ADDITIONS: ColumnAddition[] = [
  { table: "projects", column: "repo_url", definition: "TEXT NOT NULL DEFAULT ''" },
];

