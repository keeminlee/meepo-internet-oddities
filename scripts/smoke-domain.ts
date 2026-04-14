// Smoke test for the domain layer against the seeded SQLite DB.
// Exits non-zero if any expectation fails.

import { closeDb, getDb } from "../lib/db";
import * as creators from "../lib/domain/creators";
import * as projects from "../lib/domain/projects";
import * as sessions from "../lib/domain/sessions";
import * as submissions from "../lib/domain/submissions";
import * as users from "../lib/domain/users";

let failures = 0;
function expect(label: string, actual: unknown, expected: unknown): void {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "OK " : "FAIL"}  ${label}  got=${JSON.stringify(actual)}  want=${JSON.stringify(expected)}`);
  if (!pass) failures++;
}
function expectAtLeast(label: string, actual: number, min: number): void {
  const pass = actual >= min;
  console.log(`${pass ? "OK " : "FAIL"}  ${label}  got=${actual}  min=${min}`);
  if (!pass) failures++;
}

// creators
expect("listCreators length", creators.listCreators().length, 15);
expect("getCreatorByHandle avacodes", creators.getCreatorByHandle("avacodes")?.display_name, "Ava Chen");
expect("getCreatorByHandle unknown", creators.getCreatorByHandle("no-such-handle"), null);

// projects
const approved = projects.listProjects();
expectAtLeast("listProjects approved non-demo", approved.length, 1);
const featured = projects.getFeatured();
expectAtLeast("getFeatured >=0", featured.length, 0);
const newest = projects.getNewest(3);
expectAtLeast("getNewest capped at 3", newest.length, 0);
expect("getNewest <=3", newest.length <= 3, true);

// atomic click
const sample = approved[0];
if (sample) {
  const before = sample.clicks_sent;
  const after = projects.trackClick(sample.slug);
  expect("trackClick increments by 1", after?.clicks_sent, before + 1);
  expect("trackClick returns external_url", typeof after?.external_url, "string");
  // rollback
  getDb().prepare("UPDATE projects SET clicks_sent = ? WHERE slug = ?").run(before, sample.slug);
}
expect("trackClick unknown slug", projects.trackClick("no-slug-here"), null);

// users + isMeepoWriter
const user = users.getUserById("user-604ce78f");
expectAtLeast("seeded user loaded", user ? 1 : 0, 1);
expect("isMeepoWriter empty env -> false", users.isMeepoWriter("anything@example.com"), false);

// sessions
const seededSessionToken = "existing-token-placeholder";
expect("getUserFromSession invalid token", sessions.getUserFromSession(seededSessionToken), null);

// submissions listPending
expectAtLeast("listPending >=0", submissions.listPending().length, 0);

closeDb();
if (failures > 0) {
  console.error(`\n${failures} smoke failures`);
  process.exit(1);
}
console.log("\nsmoke: all green");
