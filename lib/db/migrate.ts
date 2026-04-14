// Idempotent migration runner. Safe to call at app boot and from tests.
// Re-run produces no changes because every DDL uses IF NOT EXISTS.

import { closeDb, getDb, resolveDbPath, runMigrations } from "./index";

export function migrate(): { path: string; tables: string[] } {
  const db = getDb();
  runMigrations(db);
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as Array<{ name: string }>;
  return { path: resolveDbPath(), tables: rows.map((r) => r.name) };
}

// CLI entry: `npx tsx lib/db/migrate.ts` or `node --loader tsx lib/db/migrate.ts`.
const isMain =
  typeof require !== "undefined" && require.main === module;
if (isMain) {
  const result = migrate();
  console.log(`migrated ${result.path}`);
  console.log(`tables: ${result.tables.join(", ")}`);
  closeDb();
}
