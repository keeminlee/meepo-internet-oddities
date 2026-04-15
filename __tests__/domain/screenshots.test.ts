import { describe, test, expect } from "vitest";
import { setupTestDb, seedUser, seedCreator, seedProject } from "../helpers/db";
import { createDraft, ensureFirstSnapshot, getLatestPublished } from "@/lib/domain/snapshots";
import {
  addScreenshotToDraft,
  removeScreenshot,
  updateScreenshot,
  addScreenshotToSnapshot,
  removeScreenshotFromSnapshot,
  updateScreenshotOnSnapshot,
} from "@/lib/domain/screenshots";

const ctx = setupTestDb();

// ─── addScreenshotToDraft ─────────────────────────────────────────────────────

describe("addScreenshotToDraft", () => {
  test("assigns next free position (1) when position omitted and no screenshots exist", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    createDraft(project.id);

    // Remove any auto-copied screenshots
    db.prepare(
      `DELETE FROM snapshot_screenshots WHERE snapshot_id = (
         SELECT id FROM project_snapshots WHERE project_id = ? AND is_draft = 1
       )`,
    ).run(project.id);

    const result = addScreenshotToDraft(project.id, { url: "https://example.com/1.png" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.screenshot.position).toBe(1);
    expect(result.screenshot.url).toBe("https://example.com/1.png");
  });

  test("assigns next free position (2) when position 1 is taken", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);

    // Ensure only position 1 is occupied
    db.prepare(
      "DELETE FROM snapshot_screenshots WHERE snapshot_id = ?",
    ).run(draft.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('ss-p1', ?, 1, 'https://example.com/1.png', '', datetime('now'))`,
    ).run(draft.id);

    const result = addScreenshotToDraft(project.id, { url: "https://example.com/2.png" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.screenshot.position).toBe(2);
  });

  test("assigns next free position (3) when positions 1 and 2 are taken", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);

    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(draft.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('ss-p1b', ?, 1, 'https://a.com', '', datetime('now')),
              ('ss-p2b', ?, 2, 'https://b.com', '', datetime('now'))`,
    ).run(draft.id, draft.id);

    const result = addScreenshotToDraft(project.id, { url: "https://example.com/3.png" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.screenshot.position).toBe(3);
  });

  test("explicit position is respected when free", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);
    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(draft.id);

    const result = addScreenshotToDraft(project.id, {
      url: "https://example.com/explicit.png",
      position: 3,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.screenshot.position).toBe(3);
  });

  test("returns position_taken when explicit position already used", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);

    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(draft.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('occ', ?, 2, 'https://occupied.com', '', datetime('now'))`,
    ).run(draft.id);

    const result = addScreenshotToDraft(project.id, {
      url: "https://new.com",
      position: 2,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("position_taken");
  });

  test("returns max_reached when 3 already exist (omitted position)", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);

    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(draft.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('m1', ?, 1, 'https://a.com', '', datetime('now')),
              ('m2', ?, 2, 'https://b.com', '', datetime('now')),
              ('m3', ?, 3, 'https://c.com', '', datetime('now'))`,
    ).run(draft.id, draft.id, draft.id);

    const result = addScreenshotToDraft(project.id, { url: "https://overflow.com" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("max_reached");
  });

  test("returns max_reached when 3 already exist (explicit position also blocked)", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);

    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(draft.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('x1', ?, 1, 'https://a.com', '', datetime('now')),
              ('x2', ?, 2, 'https://b.com', '', datetime('now')),
              ('x3', ?, 3, 'https://c.com', '', datetime('now'))`,
    ).run(draft.id, draft.id, draft.id);

    // Even with explicit position, max is already reached
    const result = addScreenshotToDraft(project.id, {
      url: "https://overflow.com",
      position: 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    // max_reached is checked before position_taken
    expect(result.code).toBe("max_reached");
  });

  test("returns draft_not_found when project has no draft", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    ensureFirstSnapshot(project.id); // published, no draft

    const result = addScreenshotToDraft(project.id, { url: "https://example.com/x.png" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("draft_not_found");
  });
});

// ─── removeScreenshot ─────────────────────────────────────────────────────────

describe("removeScreenshot", () => {
  test("happy path: deletes the screenshot row", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);
    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(draft.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('del-me', ?, 1, 'https://example.com', '', datetime('now'))`,
    ).run(draft.id);

    const result = removeScreenshot("del-me", project.id);
    expect(result.ok).toBe(true);

    const count = (
      db
        .prepare("SELECT COUNT(*) as n FROM snapshot_screenshots WHERE id = 'del-me'")
        .get() as { n: number }
    ).n;
    expect(count).toBe(0);
  });

  test("returns not_found when project has no draft", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    ensureFirstSnapshot(project.id);

    const result = removeScreenshot("any-id", project.id);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("not_found");
  });

  test("returns not_found when screenshot ID does not exist", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    createDraft(project.id);

    const result = removeScreenshot("nonexistent-screenshot-id", project.id);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("not_found");
  });

  test("returns forbidden when screenshot belongs to a different project's draft", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);

    const projectA = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const projectB = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });

    const draftA = createDraft(projectA.id);
    createDraft(projectB.id);

    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(draftA.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('ss-in-a', ?, 1, 'https://a.com', '', datetime('now'))`,
    ).run(draftA.id);

    // Try to remove screenshot from project A using project B's context
    const result = removeScreenshot("ss-in-a", projectB.id);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("forbidden");
  });
});

// ─── updateScreenshot ─────────────────────────────────────────────────────────

describe("updateScreenshot", () => {
  test("updates alt_text", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);
    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(draft.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('alt-ss', ?, 1, 'https://example.com', 'old alt', datetime('now'))`,
    ).run(draft.id);

    const result = updateScreenshot("alt-ss", project.id, { alt_text: "new alt text" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.screenshot.alt_text).toBe("new alt text");
  });

  test("position swap: correctly swaps positions between two screenshots", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);
    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(draft.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('swap-1', ?, 1, 'https://a.com', '', datetime('now')),
              ('swap-2', ?, 2, 'https://b.com', '', datetime('now'))`,
    ).run(draft.id, draft.id);

    const result = updateScreenshot("swap-1", project.id, { position: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.screenshot.position).toBe(2);

    // Occupant should have moved to position 1.
    const s2 = db.prepare("SELECT position FROM snapshot_screenshots WHERE id = 'swap-2'").get() as { position: number };
    expect(s2.position).toBe(1);
  });

  test("position swap with 3 screenshots — all positions remain unique after swap", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);
    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(draft.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('tx-1', ?, 1, 'https://a.com', '', datetime('now')),
              ('tx-2', ?, 2, 'https://b.com', '', datetime('now')),
              ('tx-3', ?, 3, 'https://c.com', '', datetime('now'))`,
    ).run(draft.id, draft.id, draft.id);

    // Swapping tx-1 (pos 1) → pos 3 moves occupant tx-3 to pos 1.
    const result = updateScreenshot("tx-1", project.id, { position: 3 });
    expect(result.ok).toBe(true);

    // All positions remain unique — no corruption.
    const rows = db
      .prepare(
        "SELECT id, position FROM snapshot_screenshots WHERE snapshot_id = ? ORDER BY position",
      )
      .all(draft.id) as Array<{ id: string; position: number }>;
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.position)).size).toBe(3);
    // tx-1 is now at 3, tx-3 is now at 1, tx-2 stays at 2.
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.position]));
    expect(byId["tx-1"]).toBe(3);
    expect(byId["tx-3"]).toBe(1);
    expect(byId["tx-2"]).toBe(2);
  });

  test("no-op when new position equals current position", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);
    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(draft.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('noop-ss', ?, 1, 'https://example.com', 'original', datetime('now'))`,
    ).run(draft.id);

    const result = updateScreenshot("noop-ss", project.id, { position: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.screenshot.position).toBe(1);
    expect(result.screenshot.alt_text).toBe("original");
  });
});

// ─── addScreenshotToSnapshot (generic, published snapshot) ───────────────────

describe("addScreenshotToSnapshot", () => {
  test("adds screenshot to a published snapshot by snapshotId", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    ensureFirstSnapshot(project.id);
    const latest = getLatestPublished(project.id)!;
    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(latest.id);

    const result = addScreenshotToSnapshot(latest.id, { url: "https://pub.example.com/1.png" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.screenshot.snapshot_id).toBe(latest.id);
    expect(result.screenshot.position).toBe(1);
    expect(result.screenshot.url).toBe("https://pub.example.com/1.png");
  });

  test("returns snapshot_not_found for a nonexistent snapshotId", () => {
    const result = addScreenshotToSnapshot("no-such-snapshot-id", { url: "https://x.com/a.png" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("snapshot_not_found");
  });

  test("returns max_reached when 3 screenshots already exist on snapshot", () => {
    const db = ctx.db();
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id });
    ensureFirstSnapshot(project.id);
    const latest = getLatestPublished(project.id)!;
    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(latest.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('gss1', ?, 1, 'https://a.com', '', datetime('now')),
              ('gss2', ?, 2, 'https://b.com', '', datetime('now')),
              ('gss3', ?, 3, 'https://c.com', '', datetime('now'))`,
    ).run(latest.id, latest.id, latest.id);

    const result = addScreenshotToSnapshot(latest.id, { url: "https://overflow.com" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("max_reached");
  });
});

// ─── removeScreenshotFromSnapshot (generic) ──────────────────────────────────

describe("removeScreenshotFromSnapshot", () => {
  test("removes a screenshot by id from the given snapshot", () => {
    const db = ctx.db();
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id });
    ensureFirstSnapshot(project.id);
    const latest = getLatestPublished(project.id)!;
    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(latest.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('rm-pub', ?, 1, 'https://example.com', '', datetime('now'))`,
    ).run(latest.id);

    const result = removeScreenshotFromSnapshot("rm-pub", latest.id);
    expect(result.ok).toBe(true);

    const count = (
      db.prepare("SELECT COUNT(*) as n FROM snapshot_screenshots WHERE id = 'rm-pub'").get() as { n: number }
    ).n;
    expect(count).toBe(0);
  });

  test("returns not_found when screenshot does not exist", () => {
    const db = ctx.db();
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id });
    ensureFirstSnapshot(project.id);
    const latest = getLatestPublished(project.id)!;

    const result = removeScreenshotFromSnapshot("nonexistent", latest.id);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("not_found");
  });

  test("returns forbidden when screenshot belongs to a different snapshot", () => {
    const db = ctx.db();
    const creator = seedCreator(db);
    const projectA = seedProject(db, { creator_id: creator.id });
    const projectB = seedProject(db, { creator_id: creator.id });
    ensureFirstSnapshot(projectA.id);
    ensureFirstSnapshot(projectB.id);
    const latestA = getLatestPublished(projectA.id)!;
    const latestB = getLatestPublished(projectB.id)!;

    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(latestA.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('ss-in-a-pub', ?, 1, 'https://a.com', '', datetime('now'))`,
    ).run(latestA.id);

    const result = removeScreenshotFromSnapshot("ss-in-a-pub", latestB.id);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("forbidden");
  });
});

// ─── updateScreenshotOnSnapshot (generic, fixes UNIQUE swap bug) ─────────────

describe("updateScreenshotOnSnapshot", () => {
  test("updates alt_text on a published snapshot screenshot", () => {
    const db = ctx.db();
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id });
    ensureFirstSnapshot(project.id);
    const latest = getLatestPublished(project.id)!;
    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(latest.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('upd-pub', ?, 1, 'https://example.com', 'old', datetime('now'))`,
    ).run(latest.id);

    const result = updateScreenshotOnSnapshot("upd-pub", latest.id, { alt_text: "new alt" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.screenshot.alt_text).toBe("new alt");
  });

  test("swaps positions correctly using sentinel — no UNIQUE constraint error", () => {
    const db = ctx.db();
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id });
    ensureFirstSnapshot(project.id);
    const latest = getLatestPublished(project.id)!;
    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(latest.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('swap-pub-1', ?, 1, 'https://a.com', '', datetime('now')),
              ('swap-pub-2', ?, 2, 'https://b.com', '', datetime('now'))`,
    ).run(latest.id, latest.id);

    // Should NOT throw (the sentinel-based swap fixes the UNIQUE constraint bug).
    const result = updateScreenshotOnSnapshot("swap-pub-1", latest.id, { position: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.screenshot.position).toBe(2);

    const s2 = db
      .prepare("SELECT position FROM snapshot_screenshots WHERE id = 'swap-pub-2'")
      .get() as { position: number };
    expect(s2.position).toBe(1);
  });

  test("returns forbidden when screenshot belongs to a different snapshot", () => {
    const db = ctx.db();
    const creator = seedCreator(db);
    const projectA = seedProject(db, { creator_id: creator.id });
    const projectB = seedProject(db, { creator_id: creator.id });
    ensureFirstSnapshot(projectA.id);
    ensureFirstSnapshot(projectB.id);
    const latestA = getLatestPublished(projectA.id)!;
    const latestB = getLatestPublished(projectB.id)!;

    db.prepare("DELETE FROM snapshot_screenshots WHERE snapshot_id = ?").run(latestA.id);
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('upd-a-pub', ?, 1, 'https://a.com', '', datetime('now'))`,
    ).run(latestA.id);

    const result = updateScreenshotOnSnapshot("upd-a-pub", latestB.id, { alt_text: "hacked" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("forbidden");
  });
});
