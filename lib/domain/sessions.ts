import { randomUUID } from "node:crypto";

import { getDb } from "../db";

import type { User, UserRow } from "./types";
import { mapUser } from "./types";

export function createSession(userId: string): string {
  const token = randomUUID();
  getDb()
    .prepare(
      "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
    )
    .run(token, userId, new Date().toISOString());
  return token;
}

export function destroySession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function getUserFromSession(token: string): User | null {
  if (!token) return null;
  const row = getDb()
    .prepare<[string], UserRow>(
      `SELECT u.* FROM users u
       INNER JOIN sessions s ON s.user_id = u.id
       WHERE s.token = ?`,
    )
    .get(token);
  return row ? mapUser(row) : null;
}
