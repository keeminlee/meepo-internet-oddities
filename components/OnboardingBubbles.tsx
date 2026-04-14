"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "meepo_onboarding_complete";

interface Bubble {
  title: string;
  lines: string[];
  primary: { label: string; kind: "next" | "signin" };
}

const BUBBLES: Bubble[] = [
  {
    title: "Welcome",
    lines: [
      "Welcome to Meepo — software as a society.",
      "This is a curated observatory of strange, beautiful, and promising software projects.",
    ],
    primary: { label: "Next", kind: "next" },
  },
  {
    title: "Projects",
    lines: [
      "Each card is a project — someone's dream being dragged into reality.",
      "Click one to visit it and learn more.",
    ],
    primary: { label: "Next", kind: "next" },
  },
  {
    title: "Meeps",
    lines: [
      "When you click a project, you both earn a meep.",
      "Meeps are tiny sparks of attention — yours and theirs.",
      "You get 10 clicks per day. Choose where your attention goes.",
    ],
    primary: { label: "Next", kind: "next" },
  },
  {
    title: "Loves (coming soon)",
    lines: [
      "Later, you'll be able to love a project — sending some of your own meeps to help it grow.",
      "But first, the observatory needs to wake up.",
    ],
    primary: { label: "Next", kind: "next" },
  },
  {
    title: "Sign in",
    lines: [
      "Your clicks only count when you're signed in.",
      "Sign in with GitHub to start placing your attention.",
    ],
    primary: { label: "Sign in with GitHub", kind: "signin" },
  },
];

export function OnboardingBubbles() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      const done = window.localStorage.getItem(STORAGE_KEY);
      setVisible(done !== "1");
    } catch {
      setVisible(true);
    }
    setReady(true);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore: dismiss still closes for the current session
    }
    setVisible(false);
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
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div
        role="dialog"
        aria-label={`Meepo tutorial ${index + 1} of ${BUBBLES.length}: ${bubble.title}`}
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card/95 p-5 shadow-xl backdrop-blur"
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
