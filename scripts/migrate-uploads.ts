// One-shot migration: copies any files from _legacy/server/uploads/ into the
// durable MIO_UPLOAD_DIR target. Idempotent — skips files that already exist
// at the destination.
//
// Usage: `npm run uploads:migrate` (or directly `npx tsx scripts/migrate-uploads.ts`).

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { uploadsDir } from "../lib/uploads";

function main(): void {
  const source = resolve(process.cwd(), "_legacy", "server", "uploads");
  const dest = uploadsDir();
  if (!existsSync(source)) {
    console.log(`no source directory at ${source} — nothing to migrate`);
    return;
  }
  mkdirSync(dest, { recursive: true });
  const files = readdirSync(source);
  let copied = 0;
  let skipped = 0;
  for (const f of files) {
    const src = resolve(source, f);
    const dst = resolve(dest, f);
    if (existsSync(dst)) {
      skipped++;
      continue;
    }
    copyFileSync(src, dst);
    copied++;
  }
  console.log(`uploads migrated: source=${source} dest=${dest} copied=${copied} skipped=${skipped}`);
}

main();
