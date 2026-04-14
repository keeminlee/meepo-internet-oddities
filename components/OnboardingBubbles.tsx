"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export const ONBOARDING_STORAGE_KEY = "meepo_onboarding_complete";
export const ONBOARDING_REPLAY_EVENT = "meepo:onboarding-replay";
export const ONBOARDING_DISMISS_EVENT = "meepo:onboarding-dismiss";

interface Bubble {
  title: string;
  lines: string[];
  primary: { label: string; kind: "next" | "signin" };
}

const BUBBLES: Bubble[] = [
  {
    title: "Welcome",
    lines: [
      "Welcome to Meepo — a curated home for distinctive internet oddities.",
      "Makers stay visible, software stays personal.",
    ],
    primary: { label: "Next", kind: "next" },
  },
  {
    title: "How it works",
    lines: [
      "Each card is a project. Click one to visit it — your click earns a meep for you and the project, and adds 2 meeps to the universe.",
      "You get 10 clicks per day.",
    ],
    primary: { label: "Next", kind: "next" },
  },
  {
    title: "The Observatory",
    lines: [
      "All meeps flow into the observatory — a shared tracker of collective attention.",
      "Watch it grow as the community explores.",
    ],
    primary: { label: "Next", kind: "next" },
  },
  {
    title: "Get started",
    lines: [
      "Sign in with GitHub to start placing your attention.",
      "Your clicks shape what gets seen.",
    ],
    primary: { label: "Sign in with GitHub", kind: "signin" },
  },
];

export function OnboardingBubbles() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  const show = useCallback(() => {
    setIndex(0);
    setVisible(true);
  }, []);

  useEffect(() => {
    try {
      const done = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
      setVisible(done !== "1");
    } catch {
      setVisible(true);
    }
    setReady(true);
  }, []);

  // Listen for replay requests from the info button
  useEffect(() => {
    const handler = () => show();
    window.addEventListener(ONBOARDING_REPLAY_EVENT, handler);
    return () => window.removeEventListener(ONBOARDING_REPLAY_EVENT, handler);
  }, [show]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    } catch {
      // ignore: dismiss still closes for the current session
    }
    setVisible(false);
    window.dispatchEvent(new CustomEvent(ONBOARDING_DISMISS_EVENT));
  };

  if (!ready || !visible) return null;
  const bubble = BUBBLES[index];
  const isLast = index === BUBBLES.length - 1;

  const onPrimary = () => {
    if (bubble.primary.kind === "signin") {
      dismiss();
      window.location.href = "/api/auth/github";
      return;
    }
    if (isLast) {
      dismiss();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="pointer-events-none fixed top-20 left-4 z-40 flex px-4">
      <div
        role="dialog"
        aria-label={`Meepo tutorial ${index + 1} of ${BUBBLES.length}: ${bubble.title}`}
        className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-card/95 p-5 shadow-xl backdrop-blur"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {index + 1} / {BUBBLES.length}
            </p>
            <h2 className="font-display text-lg font-bold">{bubble.title}</h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Skip tutorial"
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
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          <Button size="sm" onClick={onPrimary}>
            {bubble.primary.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
