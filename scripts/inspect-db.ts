// One-shot: rebuild project_snapshots + snapshot_screenshots so version_number
// becomes nullable. Existing rows are re-derivable via ensureFirstSnapshot on
// next page load.
import Database from "better-sqlite3";

const db = new Database("data/mio.db");
db.pragma("foreign_keys = ON");

console.log("before:", db.prepare("SELECT COUNT(*) as n FROM project_snapshots").get());

db.exec(`
  DROP TABLE IF EXISTS snapshot_screenshots;
  DROP TABLE IF EXISTS project_snapshots;

  CREATE TABLE project_snapshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER,
    title TEXT,
    tagline TEXT,
    description TEXT,
    primary_url TEXT,
    secondary_links TEXT,
    tags TEXT,
    project_status TEXT,
    update_title TEXT,
    update_body TEXT,
    is_draft INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    published_at TEXT,
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE snapshot_screenshots (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL REFERENCES project_snapshots(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
    url TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    UNIQUE(snapshot_id, position)
  );

  CREATE INDEX IF NOT EXISTS idx_snapshots_project_published ON project_snapshots(project_id, published_at);
`);

console.log("after:", db.prepare("SELECT COUNT(*) as n FROM project_snapshots").get());
console.log("version_number column info:");
console.log(db.prepare("PRAGMA table_info(project_snapshots)").all().filter((c: any) => c.name === "version_number"));
