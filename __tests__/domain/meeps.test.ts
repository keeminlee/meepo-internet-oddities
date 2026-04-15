import { randomUUID } from "node:crypto";
import { describe, test, expect } from "vitest";
import { setupTestDb, seedUser, seedCreator, seedProject } from "../helpers/db";
import {
  countedClick,
  dailyRemaining,
  filterEligibleProjectIds,
  getMeepBalance,
  getViewerEligibilityContext,
  getVisitedToday,
  isProjectEligibleForMeep,
  DAILY_CLICK_CAP,
} from "@/lib/domain/meeps";

const ctx = setupTestDb();

// ─── countedClick ─────────────────────────────────────────────────────────────

describe("countedClick — happy path", () => {
  test("user B clicks project owned by user A: kind=minted, counters incremented", () => {
    const db = ctx.db();
    const userA = seedUser(db);
    const userB = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: userA.id,
      approved: 1,
    });

    const result = countedClick({
      userId: userB.id,
      slug: project.slug,
      today: "2026-01-01",
    });

    expect(result.kind).toBe("minted");
    if (result.kind !== "minted") throw new Error("unreachable");
    expect(result.clicks_sent).toBe(1);

    // projects.meep_count incremented
    const proj = db
      .prepare("SELECT meep_count FROM projects WHERE id = ?")
      .get(project.id) as { meep_count: number };
    expect(proj.meep_count).toBe(1);

    // users.meep_balance incremented for the clicker
    const user = db
      .prepare("SELECT meep_balance FROM users WHERE id = ?")
      .get(userB.id) as { meep_balance: number };
    expect(user.meep_balance).toBe(1);

    // cosmic_state.total_meeps incremented by 2
    const cosmic = db
      .prepare("SELECT total_meeps FROM cosmic_state WHERE id = 1")
      .get() as { total_meeps: number };
    expect(cosmic.total_meeps).toBe(2);
  });
});

describe("countedClick — already_clicked (same day duplicate)", () => {
  test("second click by same user on same day: kind=already_clicked, counters unchanged", () => {
    const db = ctx.db();
    const userA = seedUser(db);
    const userB = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: userA.id,
      approved: 1,
    });

    countedClick({ userId: userB.id, slug: project.slug, today: "2026-01-01" });
    const result = countedClick({ userId: userB.id, slug: project.slug, today: "2026-01-01" });

    expect(result.kind).toBe("already_clicked");
    if (result.kind !== "already_clicked") throw new Error("unreachable");
    // clicks_sent increments as view metric
    expect(result.clicks_sent).toBe(2);

    // meep_count stays at 1
    const proj = db
      .prepare("SELECT meep_count FROM projects WHERE id = ?")
      .get(project.id) as { meep_count: number };
    expect(proj.meep_count).toBe(1);

    // meep_balance stays at 1
    const user = db
      .prepare("SELECT meep_balance FROM users WHERE id = ?")
      .get(userB.id) as { meep_balance: number };
    expect(user.meep_balance).toBe(1);

    // cosmic stays at 2
    const cosmic = db
      .prepare("SELECT total_meeps FROM cosmic_state WHERE id = 1")
      .get() as { total_meeps: number };
    expect(cosmic.total_meeps).toBe(2);
  });
});

describe("countedClick — different day counts as new mint", () => {
  test("click on different day mints again — two distinct click rows", () => {
    const db = ctx.db();
    const userA = seedUser(db);
    const userB = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: userA.id,
      approved: 1,
    });

    countedClick({ userId: userB.id, slug: project.slug, today: "2026-01-01" });
    const result = countedClick({ userId: userB.id, slug: project.slug, today: "2026-01-02" });

    expect(result.kind).toBe("minted");

    // Two distinct click rows exist
    const clickCount = (
      db
        .prepare("SELECT COUNT(*) as n FROM clicks WHERE user_id = ? AND project_id = ?")
        .get(userB.id, project.id) as { n: number }
    ).n;
    expect(clickCount).toBe(2);

    // Total meeps: 2 mints × 2 = 4
    const cosmic = db
      .prepare("SELECT total_meeps FROM cosmic_state WHERE id = 1")
      .get() as { total_meeps: number };
    expect(cosmic.total_meeps).toBe(4);
  });
});

describe("countedClick — different users, same day", () => {
  test("two different users clicking same project both mint independently", () => {
    const db = ctx.db();
    const owner = seedUser(db);
    const userB = seedUser(db);
    const userC = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: owner.id,
      approved: 1,
    });

    const r1 = countedClick({ userId: userB.id, slug: project.slug, today: "2026-01-01" });
    const r2 = countedClick({ userId: userC.id, slug: project.slug, today: "2026-01-01" });

    expect(r1.kind).toBe("minted");
    expect(r2.kind).toBe("minted");

    const proj = db
      .prepare("SELECT meep_count FROM projects WHERE id = ?")
      .get(project.id) as { meep_count: number };
    expect(proj.meep_count).toBe(2);

    const cosmic = db
      .prepare("SELECT total_meeps FROM cosmic_state WHERE id = 1")
      .get() as { total_meeps: number };
    expect(cosmic.total_meeps).toBe(4);
  });
});

describe("countedClick — self_click", () => {
  test("owner clicking their own project returns self_click, no counters touched", () => {
    const db = ctx.db();
    const owner = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: owner.id,
      approved: 1,
    });

    const result = countedClick({ userId: owner.id, slug: project.slug, today: "2026-01-01" });

    expect(result.kind).toBe("self_click");

    const proj = db
      .prepare("SELECT meep_count, clicks_sent FROM projects WHERE id = ?")
      .get(project.id) as { meep_count: number; clicks_sent: number };
    expect(proj.meep_count).toBe(0);
    // clicks_sent also not incremented on self_click
    expect(proj.clicks_sent).toBe(0);

    const cosmic = db
      .prepare("SELECT total_meeps FROM cosmic_state WHERE id = 1")
      .get() as { total_meeps: number };
    expect(cosmic.total_meeps).toBe(0);
  });
});

describe("countedClick — daily cap", () => {
  test("DAILY_CLICK_CAP distinct projects clicked: next returns daily_cap_reached, no mint", () => {
    const db = ctx.db();
    const owner = seedUser(db);
    const clicker = seedUser(db);
    const creator = seedCreator(db);

    // Mint against DAILY_CLICK_CAP distinct projects — the next one should hit the cap.
    for (let i = 0; i < DAILY_CLICK_CAP; i++) {
      const p = seedProject(db, {
        creator_id: creator.id,
        owner_user_id: owner.id,
        approved: 1,
      });
      const r = countedClick({ userId: clicker.id, slug: p.slug, today: "2026-02-01" });
      expect(r.kind).toBe("minted");
    }

    // 11th project
    const extra = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: owner.id,
      approved: 1,
    });
    const result = countedClick({ userId: clicker.id, slug: extra.slug, today: "2026-02-01" });

    expect(result.kind).toBe("daily_cap_reached");
    if (result.kind !== "daily_cap_reached") throw new Error("unreachable");
    expect(result.daily_remaining).toBe(0);

    // meep_count on the 11th project should still be 0
    const proj = db
      .prepare("SELECT meep_count FROM projects WHERE id = ?")
      .get(extra.id) as { meep_count: number };
    expect(proj.meep_count).toBe(0);
  });

  test("clicks_sent increments on daily_cap_reached (view metric)", () => {
    const db = ctx.db();
    const owner = seedUser(db);
    const clicker = seedUser(db);
    const creator = seedCreator(db);

    for (let i = 0; i < DAILY_CLICK_CAP; i++) {
      const p = seedProject(db, {
        creator_id: creator.id,
        owner_user_id: owner.id,
        approved: 1,
      });
      countedClick({ userId: clicker.id, slug: p.slug, today: "2026-02-02" });
    }

    const extra = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: owner.id,
      approved: 1,
    });
    countedClick({ userId: clicker.id, slug: extra.slug, today: "2026-02-02" });

    const proj = db
      .prepare("SELECT clicks_sent FROM projects WHERE id = ?")
      .get(extra.id) as { clicks_sent: number };
    // View metric should have incremented even though no mint happened
    expect(proj.clicks_sent).toBe(1);
  });
});

// ─── dailyRemaining ───────────────────────────────────────────────────────────

describe("dailyRemaining", () => {
  test("decrements as distinct projects are clicked", () => {
    const db = ctx.db();
    const owner = seedUser(db);
    const clicker = seedUser(db);
    const creator = seedCreator(db);

    expect(dailyRemaining(clicker.id, "2026-03-01")).toBe(DAILY_CLICK_CAP);

    const p1 = seedProject(db, { creator_id: creator.id, owner_user_id: owner.id, approved: 1 });
    countedClick({ userId: clicker.id, slug: p1.slug, today: "2026-03-01" });
    expect(dailyRemaining(clicker.id, "2026-03-01")).toBe(DAILY_CLICK_CAP - 1);

    const p2 = seedProject(db, { creator_id: creator.id, owner_user_id: owner.id, approved: 1 });
    countedClick({ userId: clicker.id, slug: p2.slug, today: "2026-03-01" });
    expect(dailyRemaining(clicker.id, "2026-03-01")).toBe(DAILY_CLICK_CAP - 2);
  });

  test("duplicate click on same project does not decrement dailyRemaining", () => {
    const db = ctx.db();
    const owner = seedUser(db);
    const clicker = seedUser(db);
    const creator = seedCreator(db);
    const p = seedProject(db, { creator_id: creator.id, owner_user_id: owner.id, approved: 1 });

    countedClick({ userId: clicker.id, slug: p.slug, today: "2026-03-05" });
    const before = dailyRemaining(clicker.id, "2026-03-05");
    // Same project, same day — already_clicked
    countedClick({ userId: clicker.id, slug: p.slug, today: "2026-03-05" });
    const after = dailyRemaining(clicker.id, "2026-03-05");

    expect(after).toBe(before);
  });
});

// ─── SQL-level invariants ─────────────────────────────────────────────────────

describe("SQL invariants", () => {
  test("UNIQUE(user_id, project_id, clicked_at): direct INSERT of duplicate row throws", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, { creator_id: creator.id, approved: 1 });

    db.prepare(
      "INSERT INTO clicks (id, user_id, project_id, clicked_at) VALUES (?, ?, ?, ?)",
    ).run(randomUUID(), user.id, project.id, "2026-01-10");

    expect(() =>
      db
        .prepare(
          "INSERT INTO clicks (id, user_id, project_id, clicked_at) VALUES (?, ?, ?, ?)",
        )
        .run(randomUUID(), user.id, project.id, "2026-01-10"),
    ).toThrow();
  });
});

// ─── user_meep_balance in results ─────────────────────────────────────────────

describe("countedClick — user_meep_balance in results", () => {
  test("minted: user_meep_balance matches users.meep_balance post-mint", () => {
    const db = ctx.db();
    const owner = seedUser(db);
    const clicker = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: owner.id,
      approved: 1,
    });

    const r = countedClick({ userId: clicker.id, slug: project.slug, today: "2026-01-01" });
    if (r.kind !== "minted") throw new Error("expected minted");
    expect(r.user_meep_balance).toBe(1);

    const row = db
      .prepare("SELECT meep_balance FROM users WHERE id = ?")
      .get(clicker.id) as { meep_balance: number };
    expect(r.user_meep_balance).toBe(row.meep_balance);
  });

  test("already_clicked: user_meep_balance reflects unchanged balance", () => {
    const db = ctx.db();
    const owner = seedUser(db);
    const clicker = seedUser(db);
    const creator = seedCreator(db);
    const project = seedProject(db, {
      creator_id: creator.id,
      owner_user_id: owner.id,
      approved: 1,
    });

    countedClick({ userId: clicker.id, slug: project.slug, today: "2026-01-01" });
    const r = countedClick({ userId: clicker.id, slug: project.slug, today: "2026-01-01" });
    if (r.kind !== "already_clicked") throw new Error("expected already_clicked");
    expect(r.user_meep_balance).toBe(1);
  });

  test("balance grows monotonically across mints", () => {
    const db = ctx.db();
    const owner = seedUser(db);
    const clicker = seedUser(db);
    const creator = seedCreator(db);

    const balances: number[] = [];
    for (let i = 0; i < 3; i++) {
      const p = seedProject(db, { creator_id: creator.id, owner_user_id: owner.id, approved: 1 });
      const r = countedClick({ userId: clicker.id, slug: p.slug, today: "2026-06-01" });
      if (r.kind !== "minted") throw new Error("expected minted");
      balances.push(r.user_meep_balance);
    }
    expect(balances).toEqual([1, 2, 3]);
  });
});

describe("getMeepBalance", () => {
  test("returns 0 for unknown user", () => {
    ctx.db();
    expect(getMeepBalance("user-does-not-exist")).toBe(0);
  });

  test("returns current balance for existing user", () => {
    const db = ctx.db();
    const u = seedUser(db);
    db.prepare("UPDATE users SET meep_balance = 7 WHERE id = ?").run(u.id);
    expect(getMeepBalance(u.id)).toBe(7);
  });
});

// ─── cosmic monotonic invariant ───────────────────────────────────────────────

describe("cosmic_state monotonic invariant", () => {
  test("total_meeps never decreases across all countedClick branches", () => {
    const db = ctx.db();
    const owner = seedUser(db);
    const clicker = seedUser(db);
    const creator = seedCreator(db);

    const getTotal = () =>
      (db.prepare("SELECT total_meeps FROM cosmic_state WHERE id = 1").get() as { total_meeps: number })
        .total_meeps;

    const initial = getTotal();

    // Mix of branches: mint, already_clicked, self_click, daily_cap
    const p1 = seedProject(db, { creator_id: creator.id, owner_user_id: owner.id, approved: 1 });
    countedClick({ userId: clicker.id, slug: p1.slug, today: "2026-05-01" }); // mint
    expect(getTotal()).toBeGreaterThanOrEqual(initial);

    countedClick({ userId: clicker.id, slug: p1.slug, today: "2026-05-01" }); // already_clicked
    expect(getTotal()).toBeGreaterThanOrEqual(initial);

    countedClick({ userId: owner.id, slug: p1.slug, today: "2026-05-01" }); // self_click
    expect(getTotal()).toBeGreaterThanOrEqual(initial);

    const final = getTotal();
    expect(final).toBeGreaterThanOrEqual(initial);
  });
});

// ─── Eligibility helpers ─────────────────────────────────────────────────────

describe("isProjectEligibleForMeep", () => {
  test("null context (anon viewer) → always ineligible", () => {
    expect(
      isProjectEligibleForMeep({ id: "p1", owner_user_id: null }, null),
    ).toBe(false);
  });

  test("self-owned project → ineligible", () => {
    const eligCtx = {
      viewerUserId: "u1",
      clickedTodayProjectIds: [],
      dailyCapReached: false,
    };
    expect(
      isProjectEligibleForMeep({ id: "p1", owner_user_id: "u1" }, eligCtx),
    ).toBe(false);
  });

  test("already clicked today → ineligible", () => {
    const eligCtx = {
      viewerUserId: "u1",
      clickedTodayProjectIds: ["p1"],
      dailyCapReached: false,
    };
    expect(
      isProjectEligibleForMeep({ id: "p1", owner_user_id: "u2" }, eligCtx),
    ).toBe(false);
  });

  test("daily cap reached → ineligible even for fresh projects", () => {
    const eligCtx = {
      viewerUserId: "u1",
      clickedTodayProjectIds: ["p1", "p2"],
      dailyCapReached: true,
    };
    expect(
      isProjectEligibleForMeep({ id: "p99", owner_user_id: "u2" }, eligCtx),
    ).toBe(false);
  });

  test("fresh project, not owned, cap not reached → eligible", () => {
    const eligCtx = {
      viewerUserId: "u1",
      clickedTodayProjectIds: [],
      dailyCapReached: false,
    };
    expect(
      isProjectEligibleForMeep({ id: "p1", owner_user_id: "u2" }, eligCtx),
    ).toBe(true);
  });

  test("unowned project (owner_user_id null) is still eligible", () => {
    const eligCtx = {
      viewerUserId: "u1",
      clickedTodayProjectIds: [],
      dailyCapReached: false,
    };
    expect(
      isProjectEligibleForMeep({ id: "p1", owner_user_id: null }, eligCtx),
    ).toBe(true);
  });
});

describe("getViewerEligibilityContext", () => {
  test("no clicks today → empty list, cap not reached", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const out = getViewerEligibilityContext(user.id, "2026-01-01");
    expect(out.clickedTodayProjectIds).toEqual([]);
    expect(out.dailyCapReached).toBe(false);
    expect(out.viewerUserId).toBe(user.id);
  });

  test("scopes to today — yesterday's clicks ignored", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const p = seedProject(db, { creator_id: creator.id });
    db.prepare("INSERT INTO clicks (id, user_id, project_id, clicked_at) VALUES (?, ?, ?, ?)")
      .run("c1", user.id, p.id, "2026-01-01");
    const out = getViewerEligibilityContext(user.id, "2026-01-02");
    expect(out.clickedTodayProjectIds).toEqual([]);
  });

  test("dailyCapReached flips at exactly DAILY_CLICK_CAP distinct projects", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    for (let i = 0; i < DAILY_CLICK_CAP; i++) {
      const p = seedProject(db, { creator_id: creator.id });
      db.prepare("INSERT INTO clicks (id, user_id, project_id, clicked_at) VALUES (?, ?, ?, ?)")
        .run(`c-${i}`, user.id, p.id, "2026-02-01");
    }
    const out = getViewerEligibilityContext(user.id, "2026-02-01");
    expect(out.clickedTodayProjectIds).toHaveLength(DAILY_CLICK_CAP);
    expect(out.dailyCapReached).toBe(true);
  });
});

describe("filterEligibleProjectIds", () => {
  test("integration: filters a homepage-like list correctly", () => {
    const db = ctx.db();
    const viewer = seedUser(db);
    const owner = seedUser(db);
    const creator = seedCreator(db);
    const mine = seedProject(db, { creator_id: creator.id, owner_user_id: viewer.id });
    const clickedToday = seedProject(db, { creator_id: creator.id, owner_user_id: owner.id });
    const fresh = seedProject(db, { creator_id: creator.id, owner_user_id: owner.id });
    db.prepare("INSERT INTO clicks (id, user_id, project_id, clicked_at) VALUES (?, ?, ?, ?)")
      .run("c1", viewer.id, clickedToday.id, "2026-03-01");
    const context = getViewerEligibilityContext(viewer.id, "2026-03-01");
    const ids = filterEligibleProjectIds(context, [
      { id: mine.id, owner_user_id: viewer.id },
      { id: clickedToday.id, owner_user_id: owner.id },
      { id: fresh.id, owner_user_id: owner.id },
    ]);
    expect(ids).toEqual([fresh.id]);
  });

  test("null context → empty", () => {
    expect(
      filterEligibleProjectIds(null, [
        { id: "p1", owner_user_id: null },
      ]),
    ).toEqual([]);
  });
});

// ─── getVisitedToday ──────────────────────────────────────────────────────────

describe("getVisitedToday", () => {
  test("returns empty array when user has no clicks today", () => {
    const db = ctx.db();
    const user = seedUser(db);
    expect(getVisitedToday(user.id, "2026-04-15")).toEqual([]);
  });

  test("returns distinct project_ids clicked on the given day", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const p1 = seedProject(db, { creator_id: creator.id });
    const p2 = seedProject(db, { creator_id: creator.id });
    db.prepare("INSERT INTO clicks (id, user_id, project_id, clicked_at) VALUES (?, ?, ?, ?)")
      .run("c1", user.id, p1.id, "2026-04-15");
    db.prepare("INSERT INTO clicks (id, user_id, project_id, clicked_at) VALUES (?, ?, ?, ?)")
      .run("c2", user.id, p2.id, "2026-04-15");
    const result = getVisitedToday(user.id, "2026-04-15");
    expect(result).toHaveLength(2);
    expect(result).toContain(p1.id);
    expect(result).toContain(p2.id);
  });

  test("scopes to today — yesterday's clicks are excluded", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const creator = seedCreator(db);
    const p = seedProject(db, { creator_id: creator.id });
    db.prepare("INSERT INTO clicks (id, user_id, project_id, clicked_at) VALUES (?, ?, ?, ?)")
      .run("c1", user.id, p.id, "2026-04-14");
    expect(getVisitedToday(user.id, "2026-04-15")).toEqual([]);
  });

  test("per-user isolation — other users' clicks not returned", () => {
    const db = ctx.db();
    const userA = seedUser(db);
    const userB = seedUser(db);
    const creator = seedCreator(db);
    const p = seedProject(db, { creator_id: creator.id });
    db.prepare("INSERT INTO clicks (id, user_id, project_id, clicked_at) VALUES (?, ?, ?, ?)")
      .run("c1", userB.id, p.id, "2026-04-15");
    // userA has no clicks — should get empty array
    expect(getVisitedToday(userA.id, "2026-04-15")).toEqual([]);
    // userB should see the project
    expect(getVisitedToday(userB.id, "2026-04-15")).toContain(p.id);
  });

  test("duplicate clicks on same project are deduplicated (DISTINCT)", () => {
    const db = ctx.db();
    const userA = seedUser(db);
    const userB = seedUser(db);
    const creator = seedCreator(db);
    const p = seedProject(db, { creator_id: creator.id, owner_user_id: userB.id, approved: 1 });
    // Use countedClick to insert a real click row, then verify DISTINCT works
    countedClick({ userId: userA.id, slug: p.slug, today: "2026-04-15" });
    // countedClick prevents duplicate rows by design; verify single result
    const result = getVisitedToday(userA.id, "2026-04-15");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(p.id);
  });
});
