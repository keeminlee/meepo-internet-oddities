export const BRAND = {
  name: "meepo",
  tagline: "Strange minds behind strange software",
  subtitle: "A creator platform for authored software",
  description:
    "A public home for weird little AI-built artifacts where makers stay visible and software feels personal, playful, and artful.",
  url: "meepo.online",
  footerLine: "Meepo · authored software deserves a cultural home",
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
  "Meepo",
] as const;

export type ProjectStatus = (typeof STATUS_OPTIONS)[number];
export type BuiltWith = (typeof BUILT_WITH_OPTIONS)[number];
export type ProjectTag = (typeof TAG_OPTIONS)[number];
