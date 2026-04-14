// CLI: `npm run db:seed` or `npx tsx scripts/seed.ts [path/to/db.json]`
// Seeds the SQLite database from a legacy db.json snapshot. Idempotent.

import { closeDb } from "../lib/db";
import { defaultSeedSource, formatReport, runSeed } from "../lib/db/seed";

function main(): void {
  const arg = process.argv[2];
  const source = arg ? arg : defaultSeedSource();
  const report = runSeed({ source });
  console.log(formatReport(report));
  closeDb();
}

main();
