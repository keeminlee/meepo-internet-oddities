// Test harness: fresh in-memory SQLite per test.
//
// Usage:
//   import { setupTestDb } from "../helpers/db";
//   const ctx = setupTestDb();          // wires beforeEach/afterEach
//   test("...", () => { ctx.db; ... }); // ctx.db is the live handle
//
// Each test starts from a migrated but otherwise empty schema. Helpers below
// seed minimal fixtures (user, creator, project) when a test needs them.

import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { afterEach, beforeEach } from "vitest";

import { closeDb, getDb, runMigrations } from "@/lib/db";

export interface TestDbCtx {
  db: () => Database.Database;
}

/**
 * Wire beforeEach/afterEach hooks that give each test a fresh in-memory DB.
 * Returns an accessor so callers get the current handle (never captured before
 * the hook runs).
 */
export function setupTestDb(): TestDbCtx {
  beforeEach(() => {
    process.env.MIO_DB_PATH = ":memory:";
    closeDb();
    const db = getDb();
    runMigrations(db);
  });

  afterEach(() => {
    closeDb();
  });

  return { db: () => getDb() };
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

export interface SeedUserOpts {
  id?: string;
  handle?: string;
  display_name?: string;
  github_id?: number;
}

export function seedUser(db: Database.Database, opts: SeedUserOpts = {}): { id: string; handle: string } {
  const id = opts.id ?? `user-${randomUUID().slice(0, 8)}`;
  const handle = opts.handle ?? `u-${id.slice(-6)}`;
  const displayName = opts.display_name ?? "Test User";
  const githubId = opts.github_id ?? Math.floor(Math.random() * 1_000_000_000);
  db.prepare(
    `INSERT INTO users (id, github_id, handle, display_name, avatar_url, email, created_at)
     VALUES (?, ?, ?, ?, '', '', ?)`,
  ).run(id, githubId, handle, displayName, new Date().toISOString());
  return { id, handle };
}

export interface SeedCreatorOpts {
  id?: string;
  handle?: string;
}

export function seedCreator(db: Database.Database, opts: SeedCreatorOpts = {}): { id: string } {
  const id = opts.id ?? `creator-${randomUUID().slice(0, 8)}`;
  const handle = opts.handle ?? `c-${id.slice(-6)}`;
  db.prepare(
    `INSERT INTO creators (id, handle, display_name, avatar_url, bio, creative_thesis, links)
     VALUES (?, ?, 'Test Creator', '', '', '', '{}')`,
  ).run(id, handle);
  return { id };
}

export interface SeedProjectOpts {
  id?: string;
  slug?: string;
  name?: string;
  creator_id?: string;
  owner_user_id?: string | null;
  external_url?: string;
  screenshot_url?: string;
  tags?: string[];
  approved?: 0 | 1;
  is_demo?: 0 | 1;
  project_status?: string;
  status?: string;
  meep_count?: number;
}

export function seedProject(db: Database.Database, opts: SeedProjectOpts = {}): { id: string; slug: string } {
  const id = opts.id ?? randomUUID();
  const slug = opts.slug ?? `p-${id.slice(0, 8)}`;
  const name = opts.name ?? "Test Project";
  const creator = opts.creator_id ?? seedCreator(db).id;
  const owner = opts.owner_user_id === undefined ? null : opts.owner_user_id;
  const externalUrl = opts.external_url ?? "https://example.com";
  const screenshot = opts.screenshot_url ?? "";
  const tags = JSON.stringify(opts.tags ?? []);
  const approved = opts.approved ?? 1;
  const demo = opts.is_demo ?? 0;
  const projectStatus = opts.project_status ?? "in progress";
  const status = opts.status ?? "Live";
  const meepCount = opts.meep_count ?? 0;
  db.prepare(
    `INSERT INTO projects (
       id, creator_id, owner_user_id, slug, name, one_line_pitch, screenshot_url,
       external_url, repo_url, built_with, tags, source_type, status, clicks_sent,
       about, why_i_made_this, featured, approved, is_demo, created_at, updated_at,
       project_status, meep_count
     ) VALUES (?, ?, ?, ?, ?, 'pitch', ?, ?, '', '', ?, 'both', ?, 0, '', '', 0, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, creator, owner, slug, name, screenshot, externalUrl, tags, status,
    approved, demo, new Date().toISOString(), new Date().toISOString(),
    projectStatus, meepCount,
  );
  return { id, slug };
}
