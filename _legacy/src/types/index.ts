import type { ProjectStatus, BuiltWith, ProjectTag } from "@/lib/constants";

// ── Creator ─────────────────────────────────────────────
export interface CreatorLinks {
  x?: string;
  github?: string;
  website?: string;
  email?: string;
  discord?: string;
}

export interface Creator {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  creative_thesis: string;
  links: CreatorLinks;
}

// ── Project ─────────────────────────────────────────────
export interface Project {
  id: string;
  creator_id: string;
  slug: string;
  name: string;
  project_avatar_url: string;
  one_line_pitch: string;
  screenshot_url: string;
  external_url: string;
  status: ProjectStatus;
  tags: ProjectTag[];
  built_with: BuiltWith;
  why_i_made_this: string;
  about: string;
  clicks_sent: number;
  featured: boolean;
  approved: boolean;
  created_at: string;
}

// ── Resolved join type for UI convenience ───────────────
export interface ProjectWithCreator extends Project {
  creator: Creator;
}
