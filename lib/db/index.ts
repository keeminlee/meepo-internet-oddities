// Driver: better-sqlite3. Synchronous API maps cleanly onto Next.js Route Handlers
// running on the Node runtime (no await boilerplate, predictable transaction
// behavior, best-in-class perf for a small single-writer workload). Drizzle was
// considered; rejected because the schema is small and stable, we already have
// TypeScript types from the existing types/index.ts, and a raw driver keeps the
// persistence layer transparent for the AUTORECURSOR verification passes.

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { COLUMN_ADDITIONS, POST_MIGRATION_DDL, SCHEMA_DDL } from "./schema";

let cached: Database.Database | null = null;

export function resolveDbPath(): string {
  const raw = process.env.MIO_DB_PATH?.trim();
  if (raw) {
    // Pass SQLite pseudo-paths (":memory:", "file::memory:?cache=shared") through
    // untouched so tests can run against an in-memory database.
    if (raw === ":memory:" || raw.startsWith("file:")) return raw;
    return resolve(raw);
  }
  return resolve(process.cwd(), "data", "mio.db");
}

export function getDb(): Database.Database {
  if (cached) return cached;
  const path = resolveDbPath();
  const inMemory = path === ":memory:" || path.startsWith("file:");
  if (!inMemory) mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  if (!inMemory) db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  cached = db;
  return db;
}

export function runMigrations(db: Database.Database = getDb()): void {
  db.exec("BEGIN");
  try {
    for (const stmt of SCHEMA_DDL) db.exec(stmt);
    for (const add of COLUMN_ADDITIONS) {
      const existing = db
        .prepare<[], { name: string }>(`PRAGMA table_info(${add.table})`)
        .all()
        .map((r) => r.name);
      if (!existing.includes(add.column)) {
        db.exec(`ALTER TABLE ${add.table} ADD COLUMN ${add.column} ${add.definition}`);
      }
    }
    for (const stmt of POST_MIGRATION_DDL) db.exec(stmt);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  // Repair: legacy dbs created before multi-provider auth have users.github_id
  // as NOT NULL. SQLite can't ALTER away NOT NULL, so we rebuild the table.
  // Idempotent — skips once notnull=0.
  repairUsersGithubIdNullability(db);
}

function repairUsersGithubIdNullability(db: Database.Database): void {
  type ColInfo = { name: string; notnull: number };
  const info = db
    .prepare<[], ColInfo>(`PRAGMA table_info(users)`)
    .all() as ColInfo[];
  const gh = info.find((c) => c.name === "github_id");
  if (!gh || gh.notnull === 0) return;

  // Copy the full existing column set so any previously-added columns survive
  // the rebuild. The new table schema here is the frozen target for this
  // repair — future column additions flow through COLUMN_ADDITIONS as normal.
  const cols = info.map((c) => c.name).join(", ");

  db.exec("PRAGMA foreign_keys = OFF");
  db.exec("BEGIN");
  try {
    db.exec(`
      CREATE TABLE users_new (
        id TEXT PRIMARY KEY,
        github_id INTEGER,
        google_id TEXT,
        handle TEXT UNIQUE,
        display_name TEXT NOT NULL,
        avatar_url TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        meep_balance INTEGER NOT NULL DEFAULT 0,
        joined_at_cosmic INTEGER NOT NULL DEFAULT 0
      )
    `);
    db.exec(`INSERT INTO users_new (${cols}) SELECT ${cols} FROM users`);
    db.exec("DROP TABLE users");
    db.exec("ALTER TABLE users_new RENAME TO users");
    for (const stmt of POST_MIGRATION_DDL) db.exec(stmt);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    db.exec("PRAGMA foreign_keys = ON");
    throw err;
  }
  db.exec("PRAGMA foreign_keys = ON");
}

// Close and clear the cached handle. Intended for tests and one-shot scripts.
export function closeDb(): void {
  if (cached) {
    cached.close();
    cached = null;
  }
}
