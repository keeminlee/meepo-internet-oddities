// Smoke test for V0 meep economy domain: mint, duplicate, self-click, cap, not-found.
import { closeDb, getDb } from "../lib/db";
import { ensureBootstrapped } from "../lib/db/bootstrap";
import { countedClick, dailyRemaining } from "../lib/domain/meeps";

ensureBootstrapped();
const db = getDb();

type U = { id: string };
type P = { slug: string; owner_user_id: string | null };
type PC = { meep_count: number; clicks_sent: number };
type UB = { meep_balance: number };
type CS = { total_meeps: number };

const user = db.prepare<[], U>("SELECT id FROM users LIMIT 1").get();
if (!user) throw new Error("no users in DB");
const project = db
  .prepare<[string], P>(
    "SELECT slug, owner_user_id FROM projects WHERE (owner_user_id IS NULL OR owner_user_id != ?) LIMIT 1",
  )
  .get(user.id);
if (!project) throw new Error("no project");

const today = "2099-01-01";
let failures = 0;
const ok = (label: string, cond: boolean) => {
  console.log(`${cond ? "OK  " : "FAIL"}  ${label}`);
  if (!cond) failures++;
};

// Reset
db.prepare("UPDATE cosmic_state SET total_meeps = 0 WHERE id = 1").run();
db.prepare("UPDATE users SET meep_balance = 0 WHERE id = ?").run(user.id);
db.prepare("UPDATE projects SET meep_count = 0").run();
db.prepare("DELETE FROM clicks WHERE user_id = ?").run(user.id);

// 1. Minted
const r1 = countedClick({ userId: user.id, slug: project.slug, today });
ok("1st click mints", r1.kind === "minted");
ok("daily_remaining = 9 after first mint", r1.kind === "minted" && r1.daily_remaining === 9);

const proj = db.prepare<[string], PC>("SELECT meep_count, clicks_sent FROM projects WHERE slug = ?").get(project.slug);
const usr = db.prepare<[string], UB>("SELECT meep_balance FROM users WHERE id = ?").get(user.id);
const cos = db.prepare<[], CS>("SELECT total_meeps FROM cosmic_state WHERE id = 1").get();
ok("project.meep_count = 1", proj?.meep_count === 1);
ok("project.clicks_sent += 1", proj !== undefined && proj.clicks_sent >= 1);
ok("user.meep_balance = 1", usr?.meep_balance === 1);
ok("cosmic_state.total_meeps = 2", cos?.total_meeps === 2);

// 2. Duplicate
const r2 = countedClick({ userId: user.id, slug: project.slug, today });
ok("2nd click same day = already_clicked", r2.kind === "already_clicked");

// 3. not_found
const r3 = countedClick({ userId: user.id, slug: "nope-nope-nope", today });
ok("unknown slug = not_found", r3.kind === "not_found");

// 4. self_click
db.prepare("UPDATE projects SET owner_user_id = ? WHERE slug = ?").run(user.id, project.slug);
const r4 = countedClick({ userId: user.id, slug: project.slug, today: "2099-01-02" });
ok("self click = self_click", r4.kind === "self_click");
db.prepare("UPDATE projects SET owner_user_id = NULL WHERE slug = ?").run(project.slug);

// 5. daily cap
const fake = "2099-02-01";
db.prepare("DELETE FROM clicks WHERE user_id = ? AND clicked_at = ?").run(user.id, fake);
const tenProjects = db.prepare<[], { slug: string }>("SELECT slug FROM projects LIMIT 10").all();
for (const p of tenProjects) {
  db.prepare("UPDATE projects SET owner_user_id = NULL WHERE slug = ?").run(p.slug);
  countedClick({ userId: user.id, slug: p.slug, today: fake });
}
const remaining = dailyRemaining(user.id, fake);
ok("after 10 distinct clicks, remaining = 0", remaining === 0);
const slugs = tenProjects.map((p) => p.slug);
const placeholders = slugs.map(() => "?").join(",");
const eleventh = db
  .prepare<string[], { slug: string }>(
    `SELECT slug FROM projects WHERE slug NOT IN (${placeholders}) LIMIT 1`,
  )
  .get(...slugs);
if (eleventh) {
  const r5 = countedClick({ userId: user.id, slug: eleventh.slug, today: fake });
  ok("11th distinct click = daily_cap_reached", r5.kind === "daily_cap_reached");
}

// Cleanup
db.prepare("DELETE FROM clicks WHERE user_id = ?").run(user.id);
db.prepare("UPDATE cosmic_state SET total_meeps = 0 WHERE id = 1").run();
db.prepare("UPDATE users SET meep_balance = 0 WHERE id = ?").run(user.id);
db.prepare("UPDATE projects SET meep_count = 0").run();
closeDb();

if (failures > 0) {
  console.error(`\n${failures} smoke failures`);
  process.exit(1);
}
console.log("\nmeeps smoke: all green");
