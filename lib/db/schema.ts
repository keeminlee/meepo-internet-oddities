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

  // ─── Meep economy (V0) ─────────────────────────────────────────
  // Counted-click ledger. One row per (user, project, calendar day) via the
  // UNIQUE constraint — enforces the "duplicate click same project same day
  // does not count" rule at the SQL level.
  `CREATE TABLE IF NOT EXISTS clicks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    clicked_at TEXT NOT NULL,
    UNIQUE(user_id, project_id, clicked_at)
  )`,

  // Singleton row keyed on id=1. Tracks lifetime cosmic meeps (never decreases
  // — invariant enforced in domain code, not SQL) and the current milestone label.
  `CREATE TABLE IF NOT EXISTS cosmic_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_meeps INTEGER NOT NULL DEFAULT 0,
    current_threshold TEXT NOT NULL DEFAULT ''
  )`,

  // Cosmic milestones. Writers/admins manage these via /admin.
  `CREATE TABLE IF NOT EXISTS thresholds (
    id TEXT PRIMARY KEY,
    meep_target INTEGER NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    feature_key TEXT NOT NULL DEFAULT '',
    unlocked INTEGER NOT NULL DEFAULT 0,
    unlocked_at TEXT NOT NULL DEFAULT ''
  )`,

  `CREATE INDEX IF NOT EXISTS idx_clicks_user_day ON clicks(user_id, clicked_at)`,
  `CREATE INDEX IF NOT EXISTS idx_clicks_project ON clicks(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_thresholds_target ON thresholds(meep_target)`,

  // Seed the singleton cosmic_state row. Idempotent via INSERT OR IGNORE on
  // the primary key — safe to run on every migrate.
  `INSERT OR IGNORE INTO cosmic_state (id, total_meeps, current_threshold) VALUES (1, 0, '')`,
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
  // Meep economy (V0). Pre-economy cohort defaults to 0 — correctly models
  // existing users as "joined at cosmic zero" and existing projects as having
  // no minted meeps yet.
  { table: "users", column: "meep_balance", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "users", column: "joined_at_cosmic", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "projects", column: "meep_count", definition: "INTEGER NOT NULL DEFAULT 0" },
  // Auto-approve flow: auto-approved projects go live immediately but still
  // land in the admin queue until a writer explicitly reviews them. Legacy
  // rows default to 0 (treated as unreviewed, which matches their historical
  // manual-approval behavior).
  { table: "projects", column: "reviewed", definition: "INTEGER NOT NULL DEFAULT 0" },
];

