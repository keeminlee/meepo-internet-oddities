// Row shapes (as SQLite returns them) + mappers to app-facing shapes.
// Booleans are INTEGER 0/1 in SQLite; tags/links are JSON TEXT.

export interface CreatorRow {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  creative_thesis: string;
  links: string; // JSON
}

export interface UserRow {
  id: string;
  github_id: number;
  handle: string | null;
  display_name: string;
  avatar_url: string;
  email: string;
  created_at: string;
}

export interface SessionRow {
  token: string;
  user_id: string;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  creator_id: string;
  owner_user_id: string | null;
  slug: string;
  name: string;
  project_avatar_url: string;
  one_line_pitch: string;
  screenshot_url: string;
  external_url: string;
  built_with: string;
  tags: string; // JSON
  source_type: string;
  status: string;
  clicks_sent: number;
  about: string;
  why_i_made_this: string;
  featured: number; // 0/1
  approved: number;
  is_demo: number;
  rejected: number;
  rejection_reason: string;
  rejected_at: string;
  rejected_by: string;
  created_at: string;
  updated_at: string;
}

// App-facing shapes (booleans as real booleans, tags/links parsed).
export interface Creator {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  creative_thesis: string;
  links: Record<string, string>;
}

export interface User {
  id: string;
  github_id: number;
  handle: string | null;
  display_name: string;
  avatar_url: string;
  email: string;
  created_at: string;
}

export interface Project {
  id: string;
  creator_id: string;
  owner_user_id: string | null;
  slug: string;
  name: string;
  project_avatar_url: string;
  one_line_pitch: string;
  screenshot_url: string;
  external_url: string;
  built_with: string;
  tags: string[];
  source_type: string;
  status: string;
  clicks_sent: number;
  about: string;
  why_i_made_this: string;
  featured: boolean;
  approved: boolean;
  is_demo: boolean;
  rejected: boolean;
  rejection_reason: string;
  rejected_at: string;
  rejected_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithCreator extends Project {
  creator: Creator | null;
}

export function mapCreator(row: CreatorRow): Creator {
  return {
    id: row.id,
    handle: row.handle,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio,
    creative_thesis: row.creative_thesis,
    links: parseJsonObject(row.links),
  };
}

export function mapUser(row: UserRow): User {
  return { ...row };
}

export function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    creator_id: row.creator_id,
    owner_user_id: row.owner_user_id,
    slug: row.slug,
    name: row.name,
    project_avatar_url: row.project_avatar_url,
    one_line_pitch: row.one_line_pitch,
    screenshot_url: row.screenshot_url,
    external_url: row.external_url,
    built_with: row.built_with,
    tags: parseJsonArray(row.tags),
    source_type: row.source_type,
    status: row.status,
    clicks_sent: row.clicks_sent,
    about: row.about,
    why_i_made_this: row.why_i_made_this,
    featured: !!row.featured,
    approved: !!row.approved,
    is_demo: !!row.is_demo,
    rejected: !!row.rejected,
    rejection_reason: row.rejection_reason,
    rejected_at: row.rejected_at,
    rejected_by: row.rejected_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function userToCreatorShape(user: User): Creator {
  return {
    id: user.id,
    handle: user.handle ?? "",
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    bio: "",
    creative_thesis: "",
    links: {},
  };
}

function parseJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function parseJsonObject(s: string): Record<string, string> {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
