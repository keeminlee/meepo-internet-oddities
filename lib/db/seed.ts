import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type Database from "better-sqlite3";

import { getDb, runMigrations } from "./index";

type LegacyCreator = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  creative_thesis?: string;
  links?: Record<string, string>;
};

type LegacyProject = {
  id: string;
  creator_id: string;
  owner_user_id?: string;
  slug: string;
  name: string;
  project_avatar_url?: string;
  one_line_pitch?: string;
  screenshot_url?: string;
  external_url?: string;
  built_with?: string;
  tags?: string[];
  source_type?: string;
  status?: string;
  clicks_sent?: number;
  about?: string;
  why_i_made_this?: string;
  featured?: boolean;
  approved?: boolean;
  is_demo?: boolean;
  rejected?: boolean;
  rejection_reason?: string;
  rejected_at?: string;
  rejected_by?: string;
  created_at: string;
  updated_at?: string;
};

type LegacySubmission = {
  project_id: string;
  user_id: string;
  submitted_at: string;
};

type LegacyUser = {
  id: string;
  github_id: number;
  handle: string | null;
  display_name: string;
  avatar_url?: string;
  email?: string;
  created_at: string;
};

type LegacySession = {
  token: string;
  user_id: string;
  created_at: string;
};

type LegacyDB = {
  creators?: LegacyCreator[];
  projects?: LegacyProject[];
  submissions?: LegacySubmission[];
  users?: LegacyUser[];
  sessions?: LegacySession[];
};

export type SeedCounts = {
  source: number;
  inserted: number;
  skipped: number;
};

export type SeedReport = {
  path: string;
  creators: SeedCounts;
  users: SeedCounts;
  sessions: SeedCounts;
  projects: SeedCounts;
  submissions: SeedCounts;
};

export function defaultSeedSource(): string {
  return resolve(process.cwd(), "_legacy", "server", "db.json");
}

export function runSeed(options: {
  source?: string;
  db?: Database.Database;
} = {}): SeedReport {
  const source = options.source ?? defaultSeedSource();
  const db = options.db ?? getDb();
  runMigrations(db);

  const raw = readFileSync(source, "utf-8");
  const data = JSON.parse(raw) as LegacyDB;

  const report: SeedReport = {
    path: source,
    creators: zero(),
    users: zero(),
    sessions: zero(),
    projects: zero(),
    submissions: zero(),
  };

  const insertCreator = db.prepare(`
    INSERT OR IGNORE INTO creators
      (id, handle, display_name, avatar_url, bio, creative_thesis, links)
    VALUES (@id, @handle, @display_name, @avatar_url, @bio, @creative_thesis, @links)
  `);
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users
      (id, github_id, handle, display_name, avatar_url, email, created_at)
    VALUES (@id, @github_id, @handle, @display_name, @avatar_url, @email, @created_at)
  `);
  const insertSession = db.prepare(`
    INSERT OR IGNORE INTO sessions (token, user_id, created_at)
    VALUES (@token, @user_id, @created_at)
  `);
  const insertProject = db.prepare(`
    INSERT OR IGNORE INTO projects (
      id, creator_id, owner_user_id, slug, name, project_avatar_url, one_line_pitch,
      screenshot_url, external_url, built_with, tags, source_type, status, clicks_sent,
      about, why_i_made_this, featured, approved, is_demo, rejected, rejection_reason,
      rejected_at, rejected_by, created_at, updated_at
    ) VALUES (
      @id, @creator_id, @owner_user_id, @slug, @name, @project_avatar_url, @one_line_pitch,
      @screenshot_url, @external_url, @built_with, @tags, @source_type, @status, @clicks_sent,
      @about, @why_i_made_this, @featured, @approved, @is_demo, @rejected, @rejection_reason,
      @rejected_at, @rejected_by, @created_at, @updated_at
    )
  `);
  const submissionExists = db.prepare(`
    SELECT 1 FROM submissions WHERE project_id = ? AND user_id = ? AND submitted_at = ?
  `);
  const insertSubmission = db.prepare(`
    INSERT INTO submissions (project_id, user_id, submitted_at)
    VALUES (@project_id, @user_id, @submitted_at)
  `);

  const tx = db.transaction(() => {
    for (const c of data.creators ?? []) {
      report.creators.source++;
      const result = insertCreator.run({
        id: c.id,
        handle: c.handle,
        display_name: c.display_name,
        avatar_url: c.avatar_url ?? "",
        bio: c.bio ?? "",
        creative_thesis: c.creative_thesis ?? "",
        links: JSON.stringify(c.links ?? {}),
      });
      if (result.changes > 0) report.creators.inserted++;
      else report.creators.skipped++;
    }

    for (const u of data.users ?? []) {
      report.users.source++;
      const result = insertUser.run({
        id: u.id,
        github_id: u.github_id,
        handle: u.handle,
        display_name: u.display_name,
        avatar_url: u.avatar_url ?? "",
        email: u.email ?? "",
        created_at: u.created_at,
      });
      if (result.changes > 0) report.users.inserted++;
      else report.users.skipped++;
    }

    for (const s of data.sessions ?? []) {
      report.sessions.source++;
      const result = insertSession.run({
        token: s.token,
        user_id: s.user_id,
        created_at: s.created_at,
      });
      if (result.changes > 0) report.sessions.inserted++;
      else report.sessions.skipped++;
    }

    for (const p of data.projects ?? []) {
      report.projects.source++;
      const result = insertProject.run({
        id: p.id,
        creator_id: p.creator_id,
        owner_user_id: p.owner_user_id ?? null,
        slug: p.slug,
        name: p.name,
        project_avatar_url: p.project_avatar_url ?? "",
        one_line_pitch: p.one_line_pitch ?? "",
        screenshot_url: p.screenshot_url ?? "",
        external_url: p.external_url ?? "",
        built_with: p.built_with ?? "",
        tags: JSON.stringify(p.tags ?? []),
        source_type: p.source_type ?? "both",
        status: p.status ?? "Live",
        clicks_sent: p.clicks_sent ?? 0,
        about: p.about ?? "",
        why_i_made_this: p.why_i_made_this ?? "",
        featured: p.featured ? 1 : 0,
        approved: p.approved ? 1 : 0,
        is_demo: p.is_demo ? 1 : 0,
        rejected: p.rejected ? 1 : 0,
        rejection_reason: p.rejection_reason ?? "",
        rejected_at: p.rejected_at ?? "",
        rejected_by: p.rejected_by ?? "",
        created_at: p.created_at,
        updated_at: p.updated_at ?? "",
      });
      if (result.changes > 0) report.projects.inserted++;
      else report.projects.skipped++;
    }

    for (const s of data.submissions ?? []) {
      report.submissions.source++;
      const existing = submissionExists.get(s.project_id, s.user_id, s.submitted_at);
      if (existing) {
        report.submissions.skipped++;
      } else {
        insertSubmission.run({
          project_id: s.project_id,
          user_id: s.user_id,
          submitted_at: s.submitted_at,
        });
        report.submissions.inserted++;
      }
    }
  });

  tx();
  return report;
}

export function formatReport(report: SeedReport): string {
  const rows: Array<[string, SeedCounts]> = [
    ["creators", report.creators],
    ["users", report.users],
    ["sessions", report.sessions],
    ["projects", report.projects],
    ["submissions", report.submissions],
  ];
  const lines = [`seed source: ${report.path}`];
  lines.push("entity         source  inserted  skipped");
  for (const [name, c] of rows) {
    lines.push(
      `${name.padEnd(13)}  ${String(c.source).padStart(6)}  ${String(c.inserted).padStart(8)}  ${String(c.skipped).padStart(7)}`,
    );
  }
  return lines.join("\n");
}

function zero(): SeedCounts {
  return { source: 0, inserted: 0, skipped: 0 };
}
