"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Bubble, TriggerPosition } from "@/lib/onboarding/triggers";

interface Props {
  ariaTitle: string;
  bubbles: Bubble[];
  position: TriggerPosition;
  onDismiss: () => void;
}

const POSITION_CLASSES: Record<TriggerPosition, string> = {
  "top-left": "top-20 left-4",
  "bottom-right": "bottom-6 right-4",
};

export function CoachBubbles({ ariaTitle, bubbles, position, onDismiss }: Props) {
  const [index, setIndex] = useState(0);
  const bubble = bubbles[index];
  if (!bubble) return null;

  const isLast = index === bubbles.length - 1;
  const onPrimary = () => {
    if (bubble.primary.kind === "signin") {
      onDismiss();
      window.location.href = "/api/auth/github";
      return;
    }
    if (isLast) onDismiss();
    else setIndex((i) => i + 1);
  };

  return (
    <div className={`pointer-events-none fixed z-40 flex px-4 ${POSITION_CLASSES[position]}`}>
      <div
        role="dialog"
        aria-label={`${ariaTitle} ${index + 1} of ${bubbles.length}: ${bubble.title}`}
        className="pointer-events-auto w-full max-w-sm rounded-2xl border-2 border-primary/40 bg-card/95 p-5 shadow-xl backdrop-blur"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-primary">
              {index + 1} / {bubbles.length}
            </p>
            <h2 className="font-display text-lg font-bold">{bubble.title}</h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
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
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onDismiss}
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
