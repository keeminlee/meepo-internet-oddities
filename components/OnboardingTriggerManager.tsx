"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CoachBubbles } from "@/components/CoachBubbles";
import { LAST_MINT_KEY } from "@/components/VisitButton";
import {
  computePendingTriggers,
  seenKey,
  TRIGGERS,
  type Trigger,
} from "@/lib/onboarding/triggers";
import { DAILY_CLICK_CAP } from "@/lib/domain/economy";

// Legacy localStorage keys that predate the unified trigger registry.
// Their values are migrated into the new seen-key scheme on first mount.
const LEGACY_KEYS = {
  initialComplete: "meepo_onboarding_complete", // -> seen("initial")
  firstMeepSeen: "meepo_first_meep_coach",      // -> seen("first_meep")
  firstMeepPending: "meepo_first_meep_pending", // transient, drop on sight
} as const;

export const ONBOARDING_REPLAY_EVENT = "meepo:onboarding-replay";
export const ONBOARDING_DISMISS_EVENT = "meepo:onboarding-dismiss";
/**
 * Dev-only: force a specific trigger to play regardless of balance, audience,
 * or seen state. Dismissing a forced trigger does NOT mark it seen — this is a
 * preview path. Event detail: { id: string }.
 */
export const ONBOARDING_FORCE_EVENT = "meepo:onboarding-force";

interface Props {
  balance: number;
  isAuthenticated: boolean;
}

function readSeen(): Set<string> {
  const out = new Set<string>();
  try {
    for (const t of TRIGGERS) {
      if (window.localStorage.getItem(seenKey(t.id)) === "1") out.add(t.id);
    }
  } catch {
    // localStorage disabled — treat all as unseen.
  }
  return out;
}

function migrateLegacy(): void {
  try {
    const ls = window.localStorage;
    if (ls.getItem(LEGACY_KEYS.initialComplete) === "1") {
      ls.setItem(seenKey("initial"), "1");
      ls.removeItem(LEGACY_KEYS.initialComplete);
    }
    if (ls.getItem(LEGACY_KEYS.firstMeepSeen) === "1") {
      ls.setItem(seenKey("first_meep"), "1");
      ls.removeItem(LEGACY_KEYS.firstMeepSeen);
    }
    ls.removeItem(LEGACY_KEYS.firstMeepPending);
  } catch {
    // noop
  }
}

export function OnboardingTriggerManager({ balance, isAuthenticated }: Props) {
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [forcedId, setForcedId] = useState<string | null>(null);
  const [mintContext, setMintContext] = useState<Record<string, string>>({});

  // One-shot: legacy migration + initial seen-set read + mint context.
  useEffect(() => {
    migrateLegacy();
    setSeen(readSeen());
    // Always-available defaults first, then overlay mint-specific fields when
    // present. Fallbacks for projectName / authorHandle let the first bubble
    // render readable copy even when there's no concrete last-mint context
    // (e.g., force-preview via the dev panel). Slugs stay empty → parseLine
    // drops the link wrapper and renders fallback text as plain prose.
    const nextContext: Record<string, string> = {
      dailyClickCap: String(DAILY_CLICK_CAP),
      projectName: "a passion project crafted",
      authorHandle: "real people",
    };
    try {
      const raw = window.localStorage.getItem(LAST_MINT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          project_name?: string;
          project_slug?: string;
          author_handle?: string;
        };
        if (parsed.project_name) nextContext.projectName = parsed.project_name;
        if (parsed.project_slug) nextContext.projectSlug = parsed.project_slug;
        if (parsed.author_handle) {
          nextContext.authorHandle = parsed.author_handle;
          // authorSlug = handle (creator slugs = handles in this app)
          nextContext.authorSlug = parsed.author_handle;
        }
      }
    } catch {
      // noop
    }
    setMintContext(nextContext);
    setReady(true);
  }, []);

  // Replay: clear the "initial" trigger's seen flag and re-evaluate. Kept on the
  // existing event name so OnboardingInfoButton keeps working without changes.
  useEffect(() => {
    const onReplay = () => {
      try {
        window.localStorage.removeItem(seenKey("initial"));
      } catch {
        // noop
      }
      setSeen((prev) => {
        const next = new Set(prev);
        next.delete("initial");
        return next;
      });
    };
    window.addEventListener(ONBOARDING_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(ONBOARDING_REPLAY_EVENT, onReplay);
  }, []);

  // Dev-only: force a specific trigger regardless of seen / audience / balance.
  useEffect(() => {
    const onForce = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string }>).detail;
      const id = detail?.id;
      if (!id) return;
      if (!TRIGGERS.some((t) => t.id === id)) return;
      setForcedId(id);
    };
    window.addEventListener(ONBOARDING_FORCE_EVENT, onForce);
    return () => window.removeEventListener(ONBOARDING_FORCE_EVENT, onForce);
  }, []);

  const queue = useMemo<Trigger[]>(
    () => computePendingTriggers({ balance, isAuthenticated, seen }),
    [balance, isAuthenticated, seen],
  );

  const forced = forcedId ? TRIGGERS.find((t) => t.id === forcedId) ?? null : null;
  const active = forced ?? queue[0];

  const dismiss = useCallback(() => {
    if (forced) {
      // Preview path — don't mark seen; just clear the force.
      setForcedId(null);
      window.dispatchEvent(
        new CustomEvent(ONBOARDING_DISMISS_EVENT, { detail: { id: forced.id, forced: true } }),
      );
      return;
    }
    if (!active) return;
    try {
      window.localStorage.setItem(seenKey(active.id), "1");
    } catch {
      // noop
    }
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(active.id);
      return next;
    });
    window.dispatchEvent(new CustomEvent(ONBOARDING_DISMISS_EVENT, { detail: { id: active.id } }));
  }, [active, forced]);

  if (!ready || !active) return null;

  return (
    <CoachBubbles
      key={forced ? `forced:${forced.id}` : active.id}
      ariaTitle={active.title}
      bubbles={active.bubbles}
      position={active.position ?? "top-left"}
      anchorId={active.anchorId}
      context={mintContext}
      onDismiss={dismiss}
    />
  );
}
