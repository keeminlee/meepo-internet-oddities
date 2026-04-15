import { describe, test, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { setupTestDb, seedUser } from "../helpers/db";
import { createSession, getUserFromSession } from "@/lib/domain/sessions";

const ctx = setupTestDb();

describe("getUserFromSession", () => {
  test("valid token returns the associated user", () => {
    const db = ctx.db();
    const user = seedUser(db, { display_name: "Alice" });
    const token = createSession(user.id);

    const result = getUserFromSession(token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(user.id);
    expect(result!.display_name).toBe("Alice");
  });

  test("missing token (empty string) returns null", () => {
    const result = getUserFromSession("");
    expect(result).toBeNull();
  });

  test("unknown token returns null", () => {
    const result = getUserFromSession(randomUUID());
    expect(result).toBeNull();
  });

  test("token refers to deleted user returns null (CASCADE DELETE cleans sessions)", () => {
    const db = ctx.db();
    const user = seedUser(db);
    const token = createSession(user.id);

    // Delete the user — ON DELETE CASCADE should remove the session
    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);

    // The session row should no longer exist due to FK cascade
    const result = getUserFromSession(token);
    // Current behavior: returns null because the JOIN finds no matching user row
    expect(result).toBeNull();
  });
});
