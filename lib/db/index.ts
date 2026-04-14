// Driver: better-sqlite3. Synchronous API maps cleanly onto Next.js Route Handlers
// running on the Node runtime (no await boilerplate, predictable transaction
// behavior, best-in-class perf for a small single-writer workload). Drizzle was
// considered; rejected because the schema is small and stable, we already have
// TypeScript types from the existing types/index.ts, and a raw driver keeps the
// persistence layer transparent for the AUTORECURSOR verification passes.

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { SCHEMA_DDL } from "./schema";

let cached: Database.Database | null = null;

export function resolveDbPath(): string {
  const raw = process.env.MIO_DB_PATH?.trim();
  if (raw) return resolve(raw);
  return resolve(process.cwd(), "data", "mio.db");
}

export function getDb(): Database.Database {
  if (cached) return cached;
  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  cached = db;
  return db;
}

export function runMigrations(db: Database.Database = getDb()): void {
  db.exec("BEGIN");
  try {
    for (const stmt of SCHEMA_DDL) db.exec(stmt);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// Close and clear the cached handle. Intended for tests and one-shot scripts.
export function closeDb(): void {
  if (cached) {
    cached.close();
    cached = null;
  }
}
