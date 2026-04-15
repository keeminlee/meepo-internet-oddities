import { describe, test, expect } from "vitest";
import { setupTestDb, seedUser, seedCreator, seedProject } from "../helpers/db";
import { createDraft, ensureFirstSnapshot } from "@/lib/domain/snapshots";
import {
  addScreenshotToDraft,
  removeScreenshot,
  updateScreenshot,
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

  test("position swap: when swapping to an occupied slot, occupant's position is swapped — BUG: throws UNIQUE constraint (domain bug)", () => {
    // DOMAIN BUG DOCUMENTED: updateScreenshot attempts to move the occupant to
    // the target's old position before moving the target to the new position.
    // However SQLite enforces UNIQUE(snapshot_id, position) immediately per
    // statement (not deferred), so setting occupant.position = 1 while
    // target is still at position 1 causes a UNIQUE constraint violation.
    // The transaction rolls back. This is a real bug in lib/domain/screenshots.ts.
    // Fix would require using a temporary sentinel position (e.g. 99) for the
    // occupant before placing it at the vacated slot.
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

    // Current behavior: throws due to UNIQUE constraint in the swap transaction.
    expect(() => updateScreenshot("swap-1", project.id, { position: 2 })).toThrow(
      /UNIQUE constraint failed/,
    );

    // Positions are unchanged (transaction rolled back)
    const s1 = db.prepare("SELECT position FROM snapshot_screenshots WHERE id = 'swap-1'").get() as { position: number };
    const s2 = db.prepare("SELECT position FROM snapshot_screenshots WHERE id = 'swap-2'").get() as { position: number };
    expect(s1.position).toBe(1);
    expect(s2.position).toBe(2);
  });

  test("position swap is transactional — no duplicate positions after swap (same UNIQUE bug — documents rollback behavior)", () => {
    // Same root cause as above: the swap throws and rolls back cleanly.
    // This test documents that the rollback leaves positions intact.
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

    // Swapping tx-1 (pos 1) → pos 3 hits the occupant (tx-3); throws and rolls back.
    expect(() => updateScreenshot("tx-1", project.id, { position: 3 })).toThrow(
      /UNIQUE constraint failed/,
    );

    // After rollback all positions remain exactly as inserted — no corruption.
    const rows = db
      .prepare(
        "SELECT id, position FROM snapshot_screenshots WHERE snapshot_id = ? ORDER BY position",
      )
      .all(draft.id) as Array<{ id: string; position: number }>;
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.position)).size).toBe(3);
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
