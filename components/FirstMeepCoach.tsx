"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { ONBOARDING_STORAGE_KEY } from "./OnboardingBubbles";

export const FIRST_MEEP_SEEN_KEY = "meepo_first_meep_coach";
export const FIRST_MEEP_PENDING_KEY = "meepo_first_meep_pending";

interface Bubble {
  title: string;
  lines: string[];
  primary: { label: string };
}

const BUBBLES: Bubble[] = [
  {
    title: "First meep earned ✦",
    lines: [
      "Nice — you just sent your first meep to a project, and earned one for yourself.",
      "That click also dropped 2 meeps into the universe counter.",
    ],
    primary: { label: "Next" },
  },
  {
    title: "One meep per new project",
    lines: [
      "Visiting a project you haven't opened before earns another meep.",
      "Re-clicking the same project today won't earn more — it's one meep per unique project.",
    ],
    primary: { label: "Next" },
  },
  {
    title: "10 meeps a day",
    lines: [
      "You can earn up to 10 meeps per day.",
      "The counter resets every morning, so there's always a fresh quest waiting.",
    ],
    primary: { label: "Next" },
  },
  {
    title: "Meepo grows with you",
    lines: [
      "Every meep earned across the site flows into the observatory — one shared signal of collective attention.",
      "The more people explore, the more the universe lights up.",
    ],
    primary: { label: "Got it" },
  },
];

export function FirstMeepCoach() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(FIRST_MEEP_SEEN_KEY, "1");
      window.localStorage.removeItem(FIRST_MEEP_PENDING_KEY);
    } catch {
      // ignore
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(FIRST_MEEP_SEEN_KEY) === "1") return;
      if (window.localStorage.getItem(FIRST_MEEP_PENDING_KEY) !== "1") return;
      // Don't overlap with the primary onboarding flow.
      if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "1") return;
    } catch {
      return;
    }
    setIndex(0);
    setVisible(true);
  }, []);

  if (!visible) return null;
  const bubble = BUBBLES[index];
  const isLast = index === BUBBLES.length - 1;

  const onPrimary = () => {
    if (isLast) dismiss();
    else setIndex((i) => i + 1);
  };

  return (
    <div className="pointer-events-none fixed bottom-6 right-4 z-40 flex px-4">
      <div
        role="dialog"
        aria-label={`First meep tutorial ${index + 1} of ${BUBBLES.length}: ${bubble.title}`}
        className="pointer-events-auto w-full max-w-sm rounded-2xl border-2 border-primary/40 bg-card/95 p-5 shadow-xl backdrop-blur"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-primary">
              {index + 1} / {BUBBLES.length}
            </p>
            <h2 className="font-display text-lg font-bold">{bubble.title}</h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss tutorial"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {bubble.lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" onClick={onPrimary}>
            {bubble.primary.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
