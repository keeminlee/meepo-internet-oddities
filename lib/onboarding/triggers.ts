import {
  DAILY_CLICK_CAP,
} from "../domain/economy";

// Generic meep-threshold onboarding triggers.
//
// A trigger fires once per device (localStorage seen-key) when the viewer's
// meep balance crosses its threshold and its audience matches. Anonymous
// viewers are treated as balance=0. Multiple crossings at once queue low→high.
//
// The registry is the single source of truth for coach content. To add a
// new coach, append an entry — no component changes required.

export type BubbleCtaKind = "next" | "signin" | "scroll" | "scroll-next";

export interface Bubble {
  title: string;
  lines: string[];
  /**
   * Primary CTA. `scroll` dismisses the coach and smooth-scrolls to
   * `scrollTarget` (an element id, e.g. "discover"). `signin` dismisses and
   * redirects to the GitHub OAuth route. `scroll-next` scrolls to target
   * then advances to the next bubble (does NOT dismiss).
   */
  primary: { label: string; kind: BubbleCtaKind; scrollTarget?: string };
  /** Per-bubble anchor element id. Overrides the trigger-level anchorId. */
  anchorId?: string;
  /** Which side of the anchor to position the bubble. Default: "below". */
  anchorSide?: "below" | "left" | "right";
  /** When true, add `.coach-highlight` CSS class to the anchor element while this bubble is active. */
  highlightAnchor?: boolean;
  /** Actions dispatched when this bubble becomes active. */
  onActivate?: { switchTab?: string };
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
  /**
   * If set, the coach positions itself directly below the element with this
   * DOM id and follows it as the page scrolls. Falls back to `position` when
   * the element is not present in the DOM.
   */
  anchorId?: string;
}

export const SEEN_KEY_PREFIX = "meepo_coach_seen_";

export function seenKey(triggerId: string): string {
  return `${SEEN_KEY_PREFIX}${triggerId}`;
}

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
        title: "Invest in the process, not just the product",
        lines: [
          "We don't treat software like a manufactured product.",
          "Our projects are stories — growing and evolving alongside the people crafting them.",
        ],
        primary: { label: "Next", kind: "next" },
      },
      {
        title: "Jump in",
        lines: [
          "Explore projects, give attention to the ones that resonate.",
          "Sign in with GitHub when you're ready to bring your own.",
        ],
        primary: { label: "Explore", kind: "scroll", scrollTarget: "projects" },
      },
    ],
  },
  {
    id: "first_meep",
    threshold: 1,
    audience: "authenticated",
    position: "top-left",
    title: "First meep earned",
    bubbles: [
      {
        title: "You just made something real",
        lines: [
          "You just gave your attention to {link:projectName:/project/{projectSlug}} by {link:authorHandle:/creator/{authorSlug}}. A meep was born.",
          "That's what meeps are. Not points. Not likes. Proof that somebody stopped and looked.",
        ],
        primary: { label: "Next", kind: "scroll-next", scrollTarget: "quest-cards" },
        // No per-bubble anchor — uses trigger position (top-left)
      },
      {
        title: "It adds up",
        lines: [
          "Every meep earned across the site flows into one shared counter — the {link:universe:/universe}.",
          "As more people explore, the universe grows. That's the whole idea: collective attention, not algorithms.",
        ],
        primary: { label: "Next", kind: "next" },
        anchorId: "quest-card-universe",
        anchorSide: "left",
        highlightAnchor: true,
      },
      {
        title: "Your quest begins",
        lines: [
          "Your quest cards track your daily progress. The first {dailyClickCap} places you visit will generate meeps.",
          "Visit new projects to fill them up!",
        ],
        primary: { label: "Next", kind: "next" },
        anchorId: "quest-card-daily",
        anchorSide: "right",
        highlightAnchor: true,
      },
      {
        title: "Find your favorites",
        lines: [
          "Projects you've given attention to show up here. Come back anytime to revisit them.",
          "Now go and continue exploring!",
        ],
        primary: { label: "Keep exploring", kind: "scroll", scrollTarget: "projects" },
        anchorId: "tab-most_loved",
        anchorSide: "below",
        highlightAnchor: true,
        onActivate: { switchTab: "most_loved" },
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
