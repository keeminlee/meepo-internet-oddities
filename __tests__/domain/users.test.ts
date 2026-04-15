import { describe, test, expect } from "vitest";

import { setupTestDb } from "../helpers/db";
import {
  findOrCreateFromGithub,
  findOrCreateFromGoogle,
  getUserByGithubId,
  getUserByGoogleId,
} from "@/lib/domain/users";

const ctx = setupTestDb();

describe("findOrCreateFromGoogle", () => {
  test("new google user: creates with google_id, null github_id", () => {
    ctx.db();
    const user = findOrCreateFromGoogle({
      google_id: "google-sub-abc",
      display_name: "Ava",
      avatar_url: "https://example.com/a.png",
      email: "ava@example.com",
    });
    expect(user.google_id).toBe("google-sub-abc");
    expect(user.github_id).toBeNull();
    expect(user.display_name).toBe("Ava");
    expect(user.email).toBe("ava@example.com");
    expect(user.handle).toBeNull();
  });

  test("returning google user: preserves user-owned display_name + avatar_url, NEVER clobbers from provider", () => {
    ctx.db();
    const first = findOrCreateFromGoogle({
      google_id: "g-42",
      display_name: "Original",
      avatar_url: "https://example.com/original.png",
      email: "o@example.com",
    });
    // Provider returns a different name + avatar (e.g. user changed them on
    // Google's side, OR our user customized via Settings). We MUST NOT
    // overwrite local values — those edits would silently revert on each login.
    const second = findOrCreateFromGoogle({
      google_id: "g-42",
      display_name: "Renamed",
      avatar_url: "https://example.com/new.png",
      email: "o@example.com",
    });
    expect(second.id).toBe(first.id);
    expect(second.display_name).toBe("Original");
    expect(second.avatar_url).toBe("https://example.com/original.png");
  });

  test("returning google user with no email on file: backfills from provider", () => {
    const db = ctx.db();
    const first = findOrCreateFromGoogle({
      google_id: "g-bf",
      display_name: "Bee",
      avatar_url: "",
      email: "",
    });
    expect(first.email).toBe("");
    const second = findOrCreateFromGoogle({
      google_id: "g-bf",
      display_name: "Bee",
      avatar_url: "",
      email: "bee@example.com",
    });
    expect(second.email).toBe("bee@example.com");
    void db;
  });

  test("empty email on re-login preserves existing email (same as github flow)", () => {
    ctx.db();
    const first = findOrCreateFromGoogle({
      google_id: "g-email",
      display_name: "E",
      avatar_url: "",
      email: "e@example.com",
    });
    const second = findOrCreateFromGoogle({
      google_id: "g-email",
      display_name: "E",
      avatar_url: "",
      email: "",
    });
    expect(second.email).toBe("e@example.com");
    expect(second.id).toBe(first.id);
  });
});

describe("getUserByGoogleId", () => {
  test("returns null for unknown google_id", () => {
    ctx.db();
    expect(getUserByGoogleId("does-not-exist")).toBeNull();
  });

  test("returns user after findOrCreateFromGoogle", () => {
    ctx.db();
    findOrCreateFromGoogle({
      google_id: "g-lookup",
      display_name: "L",
      avatar_url: "",
      email: "l@example.com",
    });
    const u = getUserByGoogleId("g-lookup");
    expect(u?.google_id).toBe("g-lookup");
  });
});

describe("multi-provider isolation", () => {
  test("github and google users coexist as distinct rows", () => {
    ctx.db();
    const gh = findOrCreateFromGithub({
      github_id: 777,
      display_name: "GH user",
      avatar_url: "",
      email: "gh@example.com",
    });
    const gg = findOrCreateFromGoogle({
      google_id: "g-777",
      display_name: "Google user",
      avatar_url: "",
      email: "gg@example.com",
    });
    expect(gh.id).not.toBe(gg.id);
    expect(gh.github_id).toBe(777);
    expect(gh.google_id).toBeNull();
    expect(gg.google_id).toBe("g-777");
    expect(gg.github_id).toBeNull();
  });

  test("getUserByGithubId does not return google-only users", () => {
    ctx.db();
    findOrCreateFromGoogle({
      google_id: "g-xx",
      display_name: "G only",
      avatar_url: "",
      email: "",
    });
    // No github_id=0 user, and google user doesn't have github_id
    expect(getUserByGithubId(0)).toBeNull();
  });

  test("google_id uniqueness enforced by partial unique index", () => {
    const db = ctx.db();
    findOrCreateFromGoogle({
      google_id: "g-unique",
      display_name: "A",
      avatar_url: "",
      email: "",
    });
    // Manual duplicate insert should throw
    expect(() =>
      db
        .prepare(
          `INSERT INTO users (id, google_id, display_name, email, created_at, avatar_url)
           VALUES ('user-dupe', 'g-unique', 'B', '', ?, '')`,
        )
        .run(new Date().toISOString()),
    ).toThrow(/UNIQUE/i);
  });
});
