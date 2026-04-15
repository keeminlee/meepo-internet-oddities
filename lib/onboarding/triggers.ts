import {
  DAILY_CLICK_CAP,
  MEEPS_PER_CLICK_COSMIC,
  MEEPS_PER_MINT_PROJECT,
  MEEPS_PER_MINT_USER,
} from "../domain/economy";

// Generic meep-threshold onboarding triggers.
//
// A trigger fires once per device (localStorage seen-key) when the viewer's
// meep balance crosses its threshold and its audience matches. Anonymous
// viewers are treated as balance=0. Multiple crossings at once queue low→high.
//
// The registry is the single source of truth for coach content. To add a
// new coach, append an entry — no component changes required.

export type BubbleCtaKind = "next" | "signin";

export interface Bubble {
  title: string;
  lines: string[];
  primary: { label: string; kind: BubbleCtaKind };
}

export type TriggerAudience = "all" | "anonymous" | "authenticated";

export type TriggerPosition = "top-left" | "bottom-right";

export interface Trigger {
  id: string;
  threshold: number;
  title: string;
  bubbles: Bubble[];
  audience?: TriggerAudience;
  position?: TriggerPosition;
}

export const SEEN_KEY_PREFIX = "meepo_coach_seen_";

export function seenKey(triggerId: string): string {
  return `${SEEN_KEY_PREFIX}${triggerId}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const TRIGGERS: Trigger[] = [
  {
    id: "initial",
    threshold: 0,
    // audience is "all" (default): fires for both anonymous and authenticated
    // viewers who haven't seen it. The last bubble's sign-in CTA is a no-op for
    // already-signed-in users; acceptable for now until a per-audience variant.
    position: "top-left",
    title: "Welcome to Meepo",
    bubbles: [
      {
        title: "Welcome to Meepo",
        lines: [
          "A curated scene for builders and the people who root for them.",
          "Every project here was made by someone who cares about it.",
        ],
        primary: { label: "Next", kind: "next" },
      },
      {
        title: "Projects that stick around",
        lines: [
          "Most places bury things in a feed. Here, projects stay visible.",
          "Browse what people are building — from first prototypes to polished launches.",
        ],
        primary: { label: "Next", kind: "next" },
      },
      {
        title: "Built by people, not algorithms",
        lines: [
          "Every project is hand-picked. No trending feeds, no engagement tricks.",
          "Click a card to visit the project and meet its maker.",
        ],
        primary: { label: "Next", kind: "next" },
      },
      {
        title: "Jump in",
        lines: [
          "Explore projects, give attention to the ones that resonate.",
          "Sign in with GitHub when you're ready to bring your own.",
        ],
        primary: { label: "Explore", kind: "next" },
      },
    ],
  },
  {
    id: "first_meep",
    threshold: 1,
    audience: "authenticated",
    position: "bottom-right",
    title: "First meep earned",
    bubbles: [
      {
        title: "First meep earned ✦",
        lines: [
          `Nice — you just sent ${plural(MEEPS_PER_MINT_PROJECT, "meep")} to a project, and earned ${plural(MEEPS_PER_MINT_USER, "meep")} for yourself.`,
          `That click also dropped ${plural(MEEPS_PER_CLICK_COSMIC, "meep")} into the universe counter.`,
        ],
        primary: { label: "Next", kind: "next" },
      },
      {
        title: `${plural(MEEPS_PER_MINT_USER, "meep")} per new project`,
        lines: [
          `Visiting a project you haven't opened before earns ${plural(MEEPS_PER_MINT_USER, "meep")}.`,
          `Re-clicking the same project today won't earn more — it's ${plural(MEEPS_PER_MINT_USER, "meep")} per unique project.`,
        ],
        primary: { label: "Next", kind: "next" },
      },
      {
        title: `${plural(DAILY_CLICK_CAP, "meep")} a day`,
        lines: [
          `You can earn up to ${plural(DAILY_CLICK_CAP, "meep")} per day.`,
          "The counter resets every morning, so there's always a fresh quest waiting.",
        ],
        primary: { label: "Next", kind: "next" },
      },
      {
        title: "Meepo grows with you",
        lines: [
          "Every meep earned across the site flows into the observatory — one shared signal of collective attention.",
          "The more people explore, the more the universe lights up.",
        ],
        primary: { label: "Got it", kind: "next" },
      },
    ],
  },
];

export interface PendingContext {
  balance: number;
  isAuthenticated: boolean;
  seen: ReadonlySet<string>;
}

/**
 * Pure: compute the ordered list of triggers that should fire given balance,
 * auth state, and the seen set. Triggers are returned low→high by threshold.
 */
export function computePendingTriggers(
  ctx: PendingContext,
  registry: readonly Trigger[] = TRIGGERS,
): Trigger[] {
  const audienceOk = (t: Trigger): boolean => {
    const a = t.audience ?? "all";
    if (a === "all") return true;
    if (a === "anonymous") return !ctx.isAuthenticated;
    return ctx.isAuthenticated;
  };
  return registry
    .filter((t) => ctx.balance >= t.threshold && audienceOk(t) && !ctx.seen.has(t.id))
    .slice()
    .sort((a, b) => a.threshold - b.threshold);
}
