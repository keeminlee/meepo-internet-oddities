// Lazy bootstrap for API routes. Ensures the SQLite schema exists before the
// first query. Seeding is triggered only when the DB is empty (no creators row),
// so production boots don't accidentally reseed over live data.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getDb, resolveDbPath, runMigrations } from "./index";
import { runSeed } from "./seed";

let bootstrapped = false;

export function ensureBootstrapped(): void {
  if (bootstrapped) return;
  const db = getDb();
  runMigrations(db);
  const row = db
    .prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM creators")
    .get();
  if (row && row.count === 0) {
    const seedPath = resolveSeedSource();
    if (seedPath && existsSync(seedPath)) {
      runSeed({ source: seedPath, db });
    }
  }
  bootstrapped = true;
}

function resolveSeedSource(): string | null {
  const env = process.env.MIO_SEED_PATH?.trim();
  if (env) return resolve(env);
  const legacy = resolve(process.cwd(), "_legacy", "server", "db.json");
  const seed = resolve(process.cwd(), "_legacy", "server", "db.seed.json");
  if (existsSync(legacy)) return legacy;
  if (existsSync(seed)) return seed;
  return null;
}

// Minimal sanity import check at bootstrap time so any malformed seed fails loudly.
export function describeBootstrapState(): string {
  ensureBootstrapped();
  return `db=${resolveDbPath()} bootstrapped=${bootstrapped}`;
}

// Side-effect-free read, used by tests.
export function readBootstrapped(): boolean {
  return bootstrapped;
}

// Re-export for convenience.
export { readFileSync };
