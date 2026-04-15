import { randomUUID } from "node:crypto";

import { getDb } from "../db";

import type { User, UserRow } from "./types";
import { mapUser } from "./types";

export function getUserById(id: string): User | null {
  const row = getDb()
    .prepare<[string], UserRow>("SELECT * FROM users WHERE id = ?")
    .get(id);
  return row ? mapUser(row) : null;
}

export function getUserByHandle(handle: string): User | null {
  const row = getDb()
    .prepare<[string], UserRow>("SELECT * FROM users WHERE handle = ?")
    .get(handle);
  return row ? mapUser(row) : null;
}

export function getUserByGithubId(githubId: number): User | null {
  const row = getDb()
    .prepare<[number], UserRow>("SELECT * FROM users WHERE github_id = ?")
    .get(githubId);
  return row ? mapUser(row) : null;
}

export function getUserByGoogleId(googleId: string): User | null {
  const row = getDb()
    .prepare<[string], UserRow>("SELECT * FROM users WHERE google_id = ?")
    .get(googleId);
  return row ? mapUser(row) : null;
}

export interface GithubProfile {
  github_id: number;
  display_name: string;
  avatar_url: string;
  email: string;
}

export function findOrCreateFromGithub(profile: GithubProfile): User {
  const db = getDb();
  const existing = getUserByGithubId(profile.github_id);
  if (existing) {
    // Treat display_name + avatar_url as user-owned once the row exists —
    // never clobber them with the provider's values on re-login. Only
    // backfill email when ours is empty AND the provider returned one.
    if (profile.email && !existing.email) {
      db.prepare("UPDATE users SET email = ? WHERE id = ?").run(profile.email, existing.id);
      const refreshed = getUserById(existing.id);
      if (refreshed) return refreshed;
    }
    return existing;
  }

  const id = `user-${randomUUID().slice(0, 8)}`;
  db.prepare(
    "INSERT INTO users (id, github_id, handle, display_name, avatar_url, email, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)",
  ).run(
    id,
    profile.github_id,
    profile.display_name,
    profile.avatar_url,
    profile.email,
    new Date().toISOString(),
  );
  const created = getUserById(id);
  if (!created) throw new Error("user creation failed");
  return created;
}

export interface GoogleProfile {
  google_id: string;
  display_name: string;
  avatar_url: string;
  email: string;
}

export function findOrCreateFromGoogle(profile: GoogleProfile): User {
  const db = getDb();
  const existing = getUserByGoogleId(profile.google_id);
  if (existing) {
    // Treat display_name + avatar_url as user-owned once the row exists —
    // never clobber them with the provider's values on re-login. Only
    // backfill email when ours is empty AND the provider returned one.
    if (profile.email && !existing.email) {
      db.prepare("UPDATE users SET email = ? WHERE id = ?").run(profile.email, existing.id);
      const refreshed = getUserById(existing.id);
      if (refreshed) return refreshed;
    }
    return existing;
  }

  const id = `user-${randomUUID().slice(0, 8)}`;
  db.prepare(
    "INSERT INTO users (id, google_id, handle, display_name, avatar_url, email, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)",
  ).run(
    id,
    profile.google_id,
    profile.display_name,
    profile.avatar_url,
    profile.email,
    new Date().toISOString(),
  );
  const created = getUserById(id);
  if (!created) throw new Error("user creation failed");
  return created;
}

export type HandleError = "invalid_format" | "taken";

const HANDLE_REGEX = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;

export function setHandle(
  userId: string,
  rawHandle: string,
): { user: User } | { error: HandleError } {
  const handle = rawHandle.trim().toLowerCase();
  if (!HANDLE_REGEX.test(handle)) return { error: "invalid_format" };
  const db = getDb();
  const clash = db
    .prepare<[string, string], { id: string }>(
      "SELECT id FROM users WHERE handle = ? AND id != ?",
    )
    .get(handle, userId);
  if (clash) return { error: "taken" };
  db.prepare("UPDATE users SET handle = ? WHERE id = ?").run(handle, userId);
  const user = getUserById(userId);
  if (!user) return { error: "invalid_format" };
  return { user };
}

export function updateProfile(
  userId: string,
  patch: { display_name?: string },
): User | null {
  if (patch.display_name !== undefined) {
    const name = patch.display_name.trim();
    if (name.length < 1 || name.length > 50) return null;
    const db = getDb();
    db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(name, userId);
    // Write-through to creators row when one exists for this user (legacy
    // seeded creators whose id matches a user id). The creator profile page
    // and project author block read from this row and would stay stale
    // otherwise. No-op when no matching creators row exists.
    db.prepare("UPDATE creators SET display_name = ? WHERE id = ?").run(name, userId);
  }
  return getUserById(userId);
}

export function meepoWriterAllowlist(): string[] {
  return (process.env.MEEPO_WRITERS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isMeepoWriter(email: string): boolean {
  if (!email) return false;
  return meepoWriterAllowlist().includes(email.toLowerCase());
}
