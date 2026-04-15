import { describe, expect, test } from "vitest";

import {
  TRIGGERS,
  computePendingTriggers,
  seenKey,
  type Trigger,
} from "@/lib/onboarding/triggers";

function tr(overrides: Partial<Trigger> = {}): Trigger {
  return {
    id: overrides.id ?? "t",
    threshold: overrides.threshold ?? 0,
    title: overrides.title ?? "t",
    bubbles: overrides.bubbles ?? [
      { title: "x", lines: ["y"], primary: { label: "ok", kind: "next" } },
    ],
    audience: overrides.audience,
    position: overrides.position,
  };
}

describe("seenKey", () => {
  test("prefixes the id", () => {
    expect(seenKey("first_meep")).toBe("meepo_coach_seen_first_meep");
  });
});

describe("computePendingTriggers — ordering and filters", () => {
  test("empty registry returns nothing", () => {
    expect(
      computePendingTriggers(
        { balance: 5, isAuthenticated: true, seen: new Set() },
        [],
      ),
    ).toEqual([]);
  });

  test("balance below threshold excludes the trigger", () => {
    const reg = [tr({ id: "a", threshold: 3 })];
    expect(
      computePendingTriggers({ balance: 2, isAuthenticated: true, seen: new Set() }, reg),
    ).toEqual([]);
  });

  test("balance exactly at threshold fires (>=)", () => {
    const reg = [tr({ id: "a", threshold: 3 })];
    const out = computePendingTriggers(
      { balance: 3, isAuthenticated: true, seen: new Set() },
      reg,
    );
    expect(out.map((t) => t.id)).toEqual(["a"]);
  });

  test("seen triggers are excluded", () => {
    const reg = [tr({ id: "a", threshold: 0 }), tr({ id: "b", threshold: 1 })];
    const out = computePendingTriggers(
      { balance: 5, isAuthenticated: true, seen: new Set(["a"]) },
      reg,
    );
    expect(out.map((t) => t.id)).toEqual(["b"]);
  });

  test("multiple crossings return low→high by threshold", () => {
    const reg = [
      tr({ id: "c", threshold: 50 }),
      tr({ id: "a", threshold: 0 }),
      tr({ id: "b", threshold: 5 }),
    ];
    const out = computePendingTriggers(
      { balance: 100, isAuthenticated: true, seen: new Set() },
      reg,
    );
    expect(out.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  test("does not mutate the registry", () => {
    const reg: Trigger[] = [
      tr({ id: "c", threshold: 50 }),
      tr({ id: "a", threshold: 0 }),
    ];
    const before = reg.map((t) => t.id);
    computePendingTriggers(
      { balance: 100, isAuthenticated: true, seen: new Set() },
      reg,
    );
    expect(reg.map((t) => t.id)).toEqual(before);
  });
});

describe("computePendingTriggers — audience gating", () => {
  test('default (undefined audience) treated as "all"', () => {
    const reg = [tr({ id: "a", threshold: 0 })];
    const anon = computePendingTriggers(
      { balance: 0, isAuthenticated: false, seen: new Set() },
      reg,
    );
    const auth = computePendingTriggers(
      { balance: 0, isAuthenticated: true, seen: new Set() },
      reg,
    );
    expect(anon.map((t) => t.id)).toEqual(["a"]);
    expect(auth.map((t) => t.id)).toEqual(["a"]);
  });

  test('"anonymous" fires only when !isAuthenticated', () => {
    const reg = [tr({ id: "a", threshold: 0, audience: "anonymous" })];
    expect(
      computePendingTriggers(
        { balance: 0, isAuthenticated: true, seen: new Set() },
        reg,
      ),
    ).toEqual([]);
    expect(
      computePendingTriggers(
        { balance: 0, isAuthenticated: false, seen: new Set() },
        reg,
      ).map((t) => t.id),
    ).toEqual(["a"]);
  });

  test('"authenticated" fires only when isAuthenticated', () => {
    const reg = [tr({ id: "a", threshold: 0, audience: "authenticated" })];
    expect(
      computePendingTriggers(
        { balance: 0, isAuthenticated: false, seen: new Set() },
        reg,
      ),
    ).toEqual([]);
    expect(
      computePendingTriggers(
        { balance: 0, isAuthenticated: true, seen: new Set() },
        reg,
      ).map((t) => t.id),
    ).toEqual(["a"]);
  });
});

describe("default TRIGGERS registry", () => {
  test("has initial (threshold 0, all) and first_meep (threshold 1, authenticated)", () => {
    const initial = TRIGGERS.find((t) => t.id === "initial");
    const firstMeep = TRIGGERS.find((t) => t.id === "first_meep");
    expect(initial?.threshold).toBe(0);
    // audience undefined == "all" — fires for both anon and authed viewers
    expect(initial?.audience).toBeUndefined();
    expect(firstMeep?.threshold).toBe(1);
    expect(firstMeep?.audience).toBe("authenticated");
  });

  test("anonymous fresh viewer: only initial fires", () => {
    const out = computePendingTriggers({
      balance: 0,
      isAuthenticated: false,
      seen: new Set(),
    });
    expect(out.map((t) => t.id)).toEqual(["initial"]);
  });

  test("authenticated 0-balance viewer with unseen initial: initial fires", () => {
    const out = computePendingTriggers({
      balance: 0,
      isAuthenticated: true,
      seen: new Set(),
    });
    expect(out.map((t) => t.id)).toEqual(["initial"]);
  });

  test("authenticated 1-meep viewer who already saw initial: first_meep fires", () => {
    const out = computePendingTriggers({
      balance: 1,
      isAuthenticated: true,
      seen: new Set(["initial"]),
    });
    expect(out.map((t) => t.id)).toEqual(["first_meep"]);
  });

  test("authenticated 1-meep viewer with fresh state: initial, then first_meep queued low→high", () => {
    const out = computePendingTriggers({
      balance: 1,
      isAuthenticated: true,
      seen: new Set(),
    });
    expect(out.map((t) => t.id)).toEqual(["initial", "first_meep"]);
  });

  test("authenticated 1-meep viewer who saw both: nothing", () => {
    const out = computePendingTriggers({
      balance: 1,
      isAuthenticated: true,
      seen: new Set(["initial", "first_meep"]),
    });
    expect(out).toEqual([]);
  });
});
