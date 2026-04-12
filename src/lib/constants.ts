export const BRAND = {
  name: "meepo",
  tagline: "Where vibe-coded projects go to live",
  subtitle: "A public home for weird little AI-built projects",
  description:
    "Tiny software. Strange ideas. Real personality. A home for the things people make because they care.",
  url: "meepo.online",
  footerLine: "Meepo · weird little projects deserve to live somewhere",
} as const;

export const STATUS_OPTIONS = [
  "Live",
  "Prototype",
  "Seeking Users",
  "Seeking Collaborator",
] as const;

export const BUILT_WITH_OPTIONS = [
  "Lovable",
  "Replit",
  "Cursor",
  "Claude",
  "ChatGPT",
  "Bolt",
  "OpenBuilder",
  "Other",
] as const;

export const TAG_OPTIONS = [
  "Weird",
  "Useful",
  "Beautiful",
  "Cursed",
  "Game",
  "Tool",
  "Experiment",
  "Story",
  "Prototype",
  "Playful",
  "Personal",
] as const;

export type ProjectStatus = (typeof STATUS_OPTIONS)[number];
export type BuiltWith = (typeof BUILT_WITH_OPTIONS)[number];
export type ProjectTag = (typeof TAG_OPTIONS)[number];
