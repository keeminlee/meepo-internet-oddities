import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { closeDb, getDb, runMigrations } from "@/lib/db";

// Fresh in-memory DB per test (not using setupTestDb helper so we can test
// runMigrations itself without the helper calling it first).
beforeEach(() => {
  process.env.MIO_DB_PATH = ":memory:";
  closeDb();
});
afterEach(() => {
  closeDb();
});

function freshDb() {
  const db = getDb();
  runMigrations(db);
  return db;
}

describe("runMigrations", () => {
  test("is idempotent — running twice does not throw", () => {
    const db = getDb();
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });

  test("all required tables exist after migration", () => {
    const db = freshDb();
    const tables = db
      .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => r.name);

    const required = [
      "creators",
      "users",
      "sessions",
      "projects",
      "submissions",
      "clicks",
      "cosmic_state",
      "thresholds",
      "project_snapshots",
      "snapshot_screenshots",
    ];
    for (const t of required) {
      expect(tables, `missing table: ${t}`).toContain(t);
    }
  });
});

describe("project_snapshots schema", () => {
  test("version_number is nullable (regression: was NOT NULL, silently broke draft creates)", () => {
    const db = freshDb();
    const cols = db
      .prepare<[], { name: string; notnull: number }>("PRAGMA table_info(project_snapshots)")
      .all();
    const col = cols.find((c) => c.name === "version_number");
    expect(col, "version_number column must exist").toBeDefined();
    // notnull=0 means the column accepts NULL
    expect(col!.notnull, "version_number must be nullable (notnull=0)").toBe(0);
  });

  test("snapshot_screenshots CHECK rejects position 0", () => {
    const db = freshDb();
    // Disable FK so we can insert a snapshot row without a real project row.
    db.pragma("foreign_keys = OFF");
    const snapId = "snap-1";
    db.prepare(
      `INSERT INTO project_snapshots (id, project_id, version_number, is_draft, created_at, updated_at)
       VALUES (?, 'proj-1', 1, 0, datetime('now'), datetime('now'))`,
    ).run(snapId);
    // position 0 violates CHECK (position BETWEEN 1 AND 3)
    expect(() =>
      db
        .prepare(
          `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
           VALUES ('ss-0', ?, 0, 'https://example.com', '', datetime('now'))`,
        )
        .run(snapId),
    ).toThrow();
  });

  test("snapshot_screenshots CHECK rejects position 4", () => {
    const db = freshDb();
    db.pragma("foreign_keys = OFF");
    const snapId = "snap-2";
    db.prepare(
      `INSERT INTO project_snapshots (id, project_id, version_number, is_draft, created_at, updated_at)
       VALUES (?, 'proj-2', 1, 0, datetime('now'), datetime('now'))`,
    ).run(snapId);
    expect(() =>
      db
        .prepare(
          `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
           VALUES ('ss-4', ?, 4, 'https://example.com', '', datetime('now'))`,
        )
        .run(snapId),
    ).toThrow();
  });

  test("UNIQUE(snapshot_id, position) prevents duplicate positions", () => {
    const db = freshDb();
    db.pragma("foreign_keys = OFF");
    const snapId = "snap-3";
    db.prepare(
      `INSERT INTO project_snapshots (id, project_id, version_number, is_draft, created_at, updated_at)
       VALUES (?, 'proj-3', 1, 0, datetime('now'), datetime('now'))`,
    ).run(snapId);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('ss-a', ?, 1, 'https://a.com', '', datetime('now'))`,
    ).run(snapId);
    expect(() =>
      db
        .prepare(
          `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
           VALUES ('ss-b', ?, 1, 'https://b.com', '', datetime('now'))`,
        )
        .run(snapId),
    ).toThrow();
  });
});

describe("COLUMN_ADDITIONS", () => {
  test("projects.project_status column exists", () => {
    const db = freshDb();
    const cols = db
      .prepare<[], { name: string }>("PRAGMA table_info(projects)")
      .all()
      .map((c) => c.name);
    expect(cols).toContain("project_status");
  });

  test("projects.meep_count column exists", () => {
    const db = freshDb();
    const cols = db
      .prepare<[], { name: string }>("PRAGMA table_info(projects)")
      .all()
      .map((c) => c.name);
    expect(cols).toContain("meep_count");
  });

  test("projects.reviewed column exists", () => {
    const db = freshDb();
    const cols = db
      .prepare<[], { name: string }>("PRAGMA table_info(projects)")
      .all()
      .map((c) => c.name);
    expect(cols).toContain("reviewed");
  });

  test("users.meep_balance column exists", () => {
    const db = freshDb();
    const cols = db
      .prepare<[], { name: string }>("PRAGMA table_info(users)")
      .all()
      .map((c) => c.name);
    expect(cols).toContain("meep_balance");
  });
});

describe("foreign keys and cascades", () => {
  test("foreign_keys pragma is ON after getDb()", () => {
    const db = freshDb();
    const row = db.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number };
    expect(row.foreign_keys).toBe(1);
  });

  test("FK CASCADE: deleting a project cascades to project_snapshots", () => {
    const db = freshDb();
    // Need a creator to satisfy FK
    db.prepare(
      `INSERT INTO creators (id, handle, display_name, avatar_url, bio, creative_thesis, links)
       VALUES ('c1', 'creator-1', 'C', '', '', '', '{}')`,
    ).run();
    db.prepare(
      `INSERT INTO projects (id, creator_id, slug, name, one_line_pitch, external_url,
         screenshot_url, source_type, status, approved, is_demo, created_at, updated_at,
         project_status, meep_count, tags)
       VALUES ('p1', 'c1', 'p-1', 'P', '', '', '', 'both', 'Live', 1, 0,
               datetime('now'), datetime('now'), 'in progress', 0, '[]')`,
    ).run();
    db.prepare(
      `INSERT INTO project_snapshots (id, project_id, version_number, is_draft, created_at, updated_at)
       VALUES ('s1', 'p1', 1, 0, datetime('now'), datetime('now'))`,
    ).run();
    db.prepare("DELETE FROM projects WHERE id = 'p1'").run();
    const count = (
      db
        .prepare("SELECT COUNT(*) as n FROM project_snapshots WHERE project_id = 'p1'")
        .get() as { n: number }
    ).n;
    expect(count).toBe(0);
  });

  test("FK CASCADE: deleting a project_snapshots row cascades to snapshot_screenshots", () => {
    const db = freshDb();
    db.prepare(
      `INSERT INTO creators (id, handle, display_name, avatar_url, bio, creative_thesis, links)
       VALUES ('c2', 'creator-2', 'C', '', '', '', '{}')`,
    ).run();
    db.prepare(
      `INSERT INTO projects (id, creator_id, slug, name, one_line_pitch, external_url,
         screenshot_url, source_type, status, approved, is_demo, created_at, updated_at,
         project_status, meep_count, tags)
       VALUES ('p2', 'c2', 'p-2', 'P', '', '', '', 'both', 'Live', 1, 0,
               datetime('now'), datetime('now'), 'in progress', 0, '[]')`,
    ).run();
    db.prepare(
      `INSERT INTO project_snapshots (id, project_id, version_number, is_draft, created_at, updated_at)
       VALUES ('s2', 'p2', 1, 0, datetime('now'), datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('ss1', 's2', 1, 'https://example.com', '', datetime('now'))`,
    ).run();
    db.prepare("DELETE FROM project_snapshots WHERE id = 's2'").run();
    const count = (
      db
        .prepare("SELECT COUNT(*) as n FROM snapshot_screenshots WHERE snapshot_id = 's2'")
        .get() as { n: number }
    ).n;
    expect(count).toBe(0);
  });
});

describe("cosmic_state", () => {
  test("singleton row with id=1 exists after migrations", () => {
    const db = freshDb();
    const row = db
      .prepare("SELECT id, total_meeps FROM cosmic_state WHERE id = 1")
      .get() as { id: number; total_meeps: number } | undefined;
    expect(row).toBeDefined();
    expect(row!.id).toBe(1);
    expect(row!.total_meeps).toBe(0);
  });

  test("INSERT OR IGNORE on id=1 is idempotent (no duplicate row)", () => {
    const db = freshDb();
    db.prepare(
      `INSERT OR IGNORE INTO cosmic_state (id, total_meeps, current_threshold) VALUES (1, 99, '')`,
    ).run();
    const count = (
      db.prepare("SELECT COUNT(*) as n FROM cosmic_state").get() as { n: number }
    ).n;
    expect(count).toBe(1);
    // Value should remain 0 (original insert won, not overwritten)
    const row = db
      .prepare("SELECT total_meeps FROM cosmic_state WHERE id = 1")
      .get() as { total_meeps: number };
    expect(row.total_meeps).toBe(0);
  });
});

describe("repair migration — legacy users.github_id NOT NULL", () => {
  test("rebuilds users table with nullable github_id and google_id column, preserves rows", () => {
    const db = getDb();
    // Simulate a legacy db created before multi-provider auth.
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        github_id INTEGER UNIQUE NOT NULL,
        handle TEXT UNIQUE,
        display_name TEXT NOT NULL,
        avatar_url TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
    `);
    db.prepare(
      `INSERT INTO users (id, github_id, display_name, created_at)
       VALUES ('u-legacy', 42, 'Legacy User', ?)`,
    ).run(new Date().toISOString());

    runMigrations(db);

    const info = db
      .prepare<[], { name: string; notnull: number }>(`PRAGMA table_info(users)`)
      .all();
    const gh = info.find((c) => c.name === "github_id");
    expect(gh?.notnull).toBe(0);
    expect(info.some((c) => c.name === "google_id")).toBe(true);

    const row = db
      .prepare("SELECT * FROM users WHERE id = 'u-legacy'")
      .get() as { github_id: number; display_name: string; google_id: string | null };
    expect(row.github_id).toBe(42);
    expect(row.display_name).toBe("Legacy User");
    expect(row.google_id).toBeNull();
  });

  test("idempotent — running migrations twice on a repaired db does not throw", () => {
    const db = getDb();
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        github_id INTEGER UNIQUE NOT NULL,
        handle TEXT UNIQUE,
        display_name TEXT NOT NULL,
        avatar_url TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
    `);
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });
});
