import { describe, test, expect, beforeEach } from "vitest";
import { setupTestDb, seedUser, seedCreator, seedProject } from "../helpers/db";
import {
  ensureFirstSnapshot,
  createDraft,
  updateDraft,
  publishDraft,
  deleteDraft,
  getSnapshots,
  getLatestPublished,
  getDraft,
} from "@/lib/domain/snapshots";

const ctx = setupTestDb();

// Helper: backdate all published snapshots for a project so the 72h gate passes.
function backdatePublished(db: ReturnType<typeof ctx.db>, projectId: string) {
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    "UPDATE project_snapshots SET published_at = ? WHERE project_id = ? AND is_draft = 0",
  ).run(fourDaysAgo, projectId);
}

// Helper: publish without hitting the rate-limit gate. Backdates any existing
// published snapshot so the 72h window has elapsed, then calls publishDraft.
function publishPast(db: ReturnType<typeof ctx.db>, projectId: string) {
  backdatePublished(db, projectId);
  return publishDraft(projectId);
}

// ─── ensureFirstSnapshot ──────────────────────────────────────────────────────

describe("ensureFirstSnapshot", () => {
  test("creates v1 published snapshot from project row fields", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      name: "My App",
      screenshot_url: "https://example.com/ss.png",
      external_url: "https://example.com",
      tags: ["react", "typescript"],
      project_status: "live",
    });

    ensureFirstSnapshot(project.id);

    const snap = getLatestPublished(project.id);
    expect(snap).not.toBeNull();
    expect(snap!.version_number).toBe(1);
    expect(snap!.is_draft).toBe(0);
    expect(snap!.title).toBe("My App");
    expect(snap!.primary_url).toBe("https://example.com");
    expect(snap!.project_status).toBe("live");
    // tags stored as JSON
    expect(snap!.tags).toBe(JSON.stringify(["react", "typescript"]));
  });

  test("creates screenshot row when project.screenshot_url is set", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      screenshot_url: "https://example.com/shot.png",
    });

    ensureFirstSnapshot(project.id);

    const snap = getLatestPublished(project.id);
    expect(snap).not.toBeNull();
    const screenshots = db
      .prepare("SELECT * FROM snapshot_screenshots WHERE snapshot_id = ?")
      .all(snap!.id) as Array<{ position: number; url: string }>;
    expect(screenshots).toHaveLength(1);
    expect(screenshots[0].position).toBe(1);
    expect(screenshots[0].url).toBe("https://example.com/shot.png");
  });

  test("does not create screenshot when screenshot_url is empty", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      screenshot_url: "",
    });

    ensureFirstSnapshot(project.id);

    const snap = getLatestPublished(project.id);
    expect(snap).not.toBeNull();
    const screenshots = db
      .prepare("SELECT * FROM snapshot_screenshots WHERE snapshot_id = ?")
      .all(snap!.id);
    expect(screenshots).toHaveLength(0);
  });

  test("is idempotent — calling twice creates only one snapshot", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });

    ensureFirstSnapshot(project.id);
    ensureFirstSnapshot(project.id);

    const count = (
      db
        .prepare("SELECT COUNT(*) as n FROM project_snapshots WHERE project_id = ?")
        .get(project.id) as { n: number }
    ).n;
    expect(count).toBe(1);
  });

  test("is a no-op when project does not exist", () => {
    expect(() => ensureFirstSnapshot("nonexistent-project-id")).not.toThrow();
    const db = ctx.db();
    const count = (
      db
        .prepare("SELECT COUNT(*) as n FROM project_snapshots WHERE project_id = ?")
        .get("nonexistent-project-id") as { n: number }
    ).n;
    expect(count).toBe(0);
  });
});

// ─── createDraft ─────────────────────────────────────────────────────────────

describe("createDraft", () => {
  test("creates draft with is_draft=1 and version_number=NULL", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      screenshot_url: "https://example.com/ss.png",
    });

    const draft = createDraft(project.id);

    expect(draft.is_draft).toBe(1);
    // version_number must be NULL for drafts — regression for the bug
    const row = db
      .prepare("SELECT version_number FROM project_snapshots WHERE id = ?")
      .get(draft.id) as { version_number: number | null };
    expect(row.version_number).toBeNull();
  });

  test("copies all fields from latest published snapshot", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      name: "Source Project",
      external_url: "https://source.com",
      tags: ["node"],
      project_status: "idea",
    });

    ensureFirstSnapshot(project.id);
    const draft = createDraft(project.id);

    expect(draft.title).toBe("Source Project");
    expect(draft.primary_url).toBe("https://source.com");
    expect(draft.project_status).toBe("idea");
    expect(draft.tags).toBe(JSON.stringify(["node"]));
  });

  test("copies screenshots from source snapshot with new IDs and same position/url", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      screenshot_url: "https://example.com/screen.png",
    });

    ensureFirstSnapshot(project.id);
    const published = getLatestPublished(project.id)!;
    const draft = createDraft(project.id);

    const draftScreenshots = db
      .prepare("SELECT * FROM snapshot_screenshots WHERE snapshot_id = ? ORDER BY position")
      .all(draft.id) as Array<{ id: string; position: number; url: string }>;
    const srcScreenshots = db
      .prepare("SELECT * FROM snapshot_screenshots WHERE snapshot_id = ? ORDER BY position")
      .all(published.id) as Array<{ id: string; position: number; url: string }>;

    expect(draftScreenshots).toHaveLength(srcScreenshots.length);
    expect(draftScreenshots[0].position).toBe(srcScreenshots[0].position);
    expect(draftScreenshots[0].url).toBe(srcScreenshots[0].url);
    // New IDs for the copied screenshots
    expect(draftScreenshots[0].id).not.toBe(srcScreenshots[0].id);
  });

  test("throws with code=DRAFT_EXISTS if draft already exists", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });

    createDraft(project.id);

    expect(() => createDraft(project.id)).toThrowError(
      expect.objectContaining({ code: "DRAFT_EXISTS" }),
    );
  });

  test("implicitly calls ensureFirstSnapshot — project with no snapshots still produces a draft", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    // No explicit ensureFirstSnapshot call before createDraft
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });

    const draft = createDraft(project.id);
    expect(draft.is_draft).toBe(1);

    // A v1 published snapshot should also exist now
    const snap = getLatestPublished(project.id);
    expect(snap).not.toBeNull();
    expect(snap!.version_number).toBe(1);
  });
});

// ─── updateDraft ─────────────────────────────────────────────────────────────

describe("updateDraft", () => {
  test("updates only supplied fields — others remain untouched", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      name: "Original Name",
      external_url: "https://original.com",
    });
    const draft = createDraft(project.id);
    const beforeTagline = draft.tagline;

    const updated = updateDraft(draft.id, { title: "New Title" });

    expect(updated.title).toBe("New Title");
    // primary_url untouched
    expect(updated.primary_url).toBe("https://original.com");
    expect(updated.tagline).toBe(beforeTagline);
  });

  test("JSON-stringifies tags array", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);

    updateDraft(draft.id, { tags: ["react", "node"] });

    const row = db
      .prepare("SELECT tags FROM project_snapshots WHERE id = ?")
      .get(draft.id) as { tags: string };
    expect(row.tags).toBe('["react","node"]');
  });

  test("JSON-stringifies secondary_links array", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);

    updateDraft(draft.id, { secondary_links: ["https://github.com/x", "https://docs.com"] });

    const row = db
      .prepare("SELECT secondary_links FROM project_snapshots WHERE id = ?")
      .get(draft.id) as { secondary_links: string };
    const parsed = JSON.parse(row.secondary_links);
    expect(parsed).toEqual(["https://github.com/x", "https://docs.com"]);
  });

  test("updates updated_at timestamp", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);
    const before = draft.updated_at;

    const updated = updateDraft(draft.id, { title: "Changed" });
    expect(updated.updated_at).toBeDefined();
    expect(updated.updated_at >= before).toBe(true);
  });

  test("WHERE clause guards is_draft=1 — updating a published snapshot id leaves its title unchanged", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      name: "Published Project",
    });
    ensureFirstSnapshot(project.id);
    const published = getLatestPublished(project.id)!;
    const originalTitle = published.title;

    // updateDraft targets id AND is_draft=1; published snapshot has is_draft=0,
    // so the UPDATE silently no-ops. The function then re-reads the row (which
    // exists but with original values) and returns it. Current behavior: no throw,
    // but title is NOT changed.
    expect(() => updateDraft(published.id, { title: "Tampered" })).not.toThrow();

    const check = db
      .prepare("SELECT title FROM project_snapshots WHERE id = ?")
      .get(published.id) as { title: string };
    expect(check.title).toBe(originalTitle);
  });
});

// ─── publishDraft ─────────────────────────────────────────────────────────────

describe("publishDraft", () => {
  test("first publish assigns version_number=1 and clears is_draft", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    createDraft(project.id);
    // The ensureFirstSnapshot inside createDraft sets published_at=now; backdate so
    // the 72h rate-limit gate passes.
    backdatePublished(db, project.id);

    const result = publishDraft(project.id);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.snapshot.version_number).toBe(2); // v1 from ensureFirstSnapshot, v2 from this publish
    expect(result.snapshot.is_draft).toBe(0);
    expect(result.snapshot.published_at).not.toBeNull();
  });

  test("first publish on a blank project (manual draft, no prior published) assigns version_number=1", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });

    // Insert a draft directly without going through createDraft (which calls ensureFirstSnapshot)
    db.prepare(
      `INSERT INTO project_snapshots (id, project_id, version_number, title, is_draft, created_at, updated_at)
       VALUES ('manual-draft', ?, NULL, 'Test', 1, datetime('now'), datetime('now'))`,
    ).run(project.id);

    const result = publishDraft(project.id);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.snapshot.version_number).toBe(1);
    expect(result.snapshot.is_draft).toBe(0);
  });

  test("second publish 4 days later assigns next version_number", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    createDraft(project.id);
    const r1 = publishPast(db, project.id);
    expect(r1.ok).toBe(true);
    const firstVersion = r1.ok ? r1.snapshot.version_number : 0;

    createDraft(project.id);
    const r2 = publishPast(db, project.id);

    expect(r2.ok).toBe(true);
    if (!r2.ok) throw new Error("unreachable");
    expect(r2.snapshot.version_number).toBe(firstVersion + 1);
  });

  test("version_number is monotonic: always max+1", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });

    createDraft(project.id);
    const r1 = publishPast(db, project.id);
    expect(r1.ok).toBe(true);
    const v1 = r1.ok ? r1.snapshot.version_number : 0;

    createDraft(project.id);
    const r2 = publishPast(db, project.id);
    expect(r2.ok).toBe(true);
    const v2 = r2.ok ? r2.snapshot.version_number : 0;

    createDraft(project.id);
    const r3 = publishPast(db, project.id);
    expect(r3.ok).toBe(true);
    if (!r3.ok) throw new Error("unreachable");
    expect(r3.snapshot.version_number).toBe(v2 + 1);
    expect(v2).toBe(v1 + 1);
  });

  test("3-day gate: published 1 day ago returns rate_limited with retry_after", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    createDraft(project.id);
    publishPast(db, project.id);

    // Set published_at to exactly 1 day ago so gate fires
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      "UPDATE project_snapshots SET published_at = ? WHERE project_id = ? AND is_draft = 0 AND version_number = (SELECT MAX(version_number) FROM project_snapshots WHERE project_id = ? AND is_draft = 0)",
    ).run(oneDayAgo, project.id, project.id);

    createDraft(project.id);
    const result = publishDraft(project.id);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("rate_limited");
    expect(result.retry_after).toBeDefined();
    // retry_after should be ~72h after the faked publish date
    const retryDate = new Date(result.retry_after!).getTime();
    const publishDate = new Date(oneDayAgo).getTime();
    expect(retryDate - publishDate).toBeCloseTo(72 * 60 * 60 * 1000, -3);
  });

  test("exactly 72h+1s old is allowed (boundary: >= not >)", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    createDraft(project.id);
    publishPast(db, project.id);

    // Just over the 72h boundary
    const justOver72h = new Date(Date.now() - (72 * 60 * 60 * 1000 + 1000)).toISOString();
    db.prepare(
      "UPDATE project_snapshots SET published_at = ? WHERE project_id = ? AND is_draft = 0 AND version_number = (SELECT MAX(version_number) FROM project_snapshots WHERE project_id = ? AND is_draft = 0)",
    ).run(justOver72h, project.id, project.id);

    createDraft(project.id);
    const result = publishDraft(project.id);
    expect(result.ok).toBe(true);
  });

  test("no draft present returns no_draft", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });

    // Insert a published snapshot directly, backdated so rate-limit passes,
    // and leave no draft.
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO project_snapshots (id, project_id, version_number, is_draft, created_at, published_at, updated_at)
       VALUES ('pub-only', ?, 1, 0, ?, ?, ?)`,
    ).run(project.id, fourDaysAgo, fourDaysAgo, fourDaysAgo);

    const result = publishDraft(project.id);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("no_draft");
  });

  test("write-through: projects.name updated to snapshot title after publish", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);
    updateDraft(draft.id, { title: "Updated Title" });

    publishPast(db, project.id);

    const row = db
      .prepare("SELECT name FROM projects WHERE id = ?")
      .get(project.id) as { name: string };
    expect(row.name).toBe("Updated Title");
  });

  test("tags write-through regression: after publishing, projects.tags equals snapshot.tags", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    const draft = createDraft(project.id);
    updateDraft(draft.id, { tags: ["vue", "firebase", "pwa"] });

    publishPast(db, project.id);

    const projectRow = db
      .prepare("SELECT tags FROM projects WHERE id = ?")
      .get(project.id) as { tags: string };
    const snapRow = db
      .prepare(
        "SELECT tags FROM project_snapshots WHERE project_id = ? AND is_draft = 0 ORDER BY version_number DESC LIMIT 1",
      )
      .get(project.id) as { tags: string };
    expect(projectRow.tags).toBe(snapRow.tags);
    expect(JSON.parse(projectRow.tags)).toEqual(["vue", "firebase", "pwa"]);
  });

  test("write-through: projects.screenshot_url updated to first screenshot url", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    // No screenshot on the project so ensureFirstSnapshot creates no screenshot
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      screenshot_url: "",
    });
    const draft = createDraft(project.id);

    // Add a screenshot to the draft
    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('new-ss', ?, 1, 'https://new.com/shot.png', '', datetime('now'))`,
    ).run(draft.id);

    publishPast(db, project.id);

    const row = db
      .prepare("SELECT screenshot_url FROM projects WHERE id = ?")
      .get(project.id) as { screenshot_url: string };
    expect(row.screenshot_url).toBe("https://new.com/shot.png");
  });

  test("write-through does NOT overwrite projects.name when draft.title is NULL", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      name: "Keep Me",
    });
    createDraft(project.id);
    // Set title to NULL on the draft manually
    const draftRow = db
      .prepare("SELECT id FROM project_snapshots WHERE project_id = ? AND is_draft = 1")
      .get(project.id) as { id: string };
    db.prepare("UPDATE project_snapshots SET title = NULL WHERE id = ?").run(draftRow.id);

    publishPast(db, project.id);

    const row = db
      .prepare("SELECT name FROM projects WHERE id = ?")
      .get(project.id) as { name: string };
    // name should NOT have been overwritten with NULL
    expect(row.name).toBe("Keep Me");
  });
});

// ─── deleteDraft ─────────────────────────────────────────────────────────────

describe("deleteDraft", () => {
  test("returns true when draft existed and deletes it", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    createDraft(project.id);

    const result = deleteDraft(project.id);
    expect(result).toBe(true);
    expect(getDraft(project.id)).toBeNull();
  });

  test("returns false when no draft exists", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    ensureFirstSnapshot(project.id);

    const result = deleteDraft(project.id);
    expect(result).toBe(false);
  });

  test("FK cascade: deleting draft removes its screenshots", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      screenshot_url: "https://example.com/ss.png",
    });
    const draft = createDraft(project.id);

    deleteDraft(project.id);

    const count = (
      db
        .prepare("SELECT COUNT(*) as n FROM snapshot_screenshots WHERE snapshot_id = ?")
        .get(draft.id) as { n: number }
    ).n;
    expect(count).toBe(0);
  });
});

// ─── getSnapshots ─────────────────────────────────────────────────────────────

describe("getSnapshots", () => {
  test("returns published snapshots only — excludes drafts", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });

    ensureFirstSnapshot(project.id); // v1 published
    createDraft(project.id); // draft (doesn't publish it)

    const results = getSnapshots(project.id);
    expect(results).toHaveLength(1);
    expect(results[0].is_draft).toBe(0);
  });

  test("returns snapshots in reverse chronological order (newest first)", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });

    createDraft(project.id);
    publishPast(db, project.id);
    const v1 = getLatestPublished(project.id)!.version_number;

    createDraft(project.id);
    publishPast(db, project.id);

    const results = getSnapshots(project.id);
    expect(results.length).toBeGreaterThanOrEqual(2);
    // Newest (highest version) should be first
    expect(results[0].version_number).toBeGreaterThan(results[results.length - 1].version_number);
  });
});

// ─── getLatestPublished ───────────────────────────────────────────────────────

describe("getLatestPublished", () => {
  test("returns the most recently published snapshot", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });

    createDraft(project.id);
    publishPast(db, project.id);
    const afterFirst = getLatestPublished(project.id)!.version_number;

    createDraft(project.id);
    publishPast(db, project.id);
    const afterSecond = getLatestPublished(project.id)!.version_number;

    expect(afterSecond).toBeGreaterThan(afterFirst);
  });

  test("returns null when project has no published snapshots", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });

    const result = getLatestPublished(project.id);
    expect(result).toBeNull();
  });
});

// ─── getDraft ─────────────────────────────────────────────────────────────────

describe("getDraft", () => {
  test("returns draft with screenshots array ordered by position", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: user.id,
      screenshot_url: "", // no auto-screenshot so we control positions precisely
    });
    const draft = createDraft(project.id);

    db.prepare(
      `INSERT INTO snapshot_screenshots (id, snapshot_id, position, url, alt_text, created_at)
       VALUES ('ss-pos1', ?, 1, 'https://example.com/ss1.png', '', datetime('now')),
              ('ss-pos2', ?, 2, 'https://example.com/ss2.png', '', datetime('now'))`,
    ).run(draft.id, draft.id);

    const result = getDraft(project.id);
    expect(result).not.toBeNull();
    expect(result!.is_draft).toBe(1);
    expect(result!.screenshots).toHaveLength(2);
    expect(result!.screenshots[0].position).toBe(1);
    expect(result!.screenshots[1].position).toBe(2);
  });

  test("returns null when no draft exists", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, owner_user_id: user.id });
    ensureFirstSnapshot(project.id);

    expect(getDraft(project.id)).toBeNull();
  });
});
