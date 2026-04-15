"use client";

import { HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";

import {
  ONBOARDING_DISMISS_EVENT,
  ONBOARDING_REPLAY_EVENT,
} from "@/components/OnboardingTriggerManager";
import { seenKey } from "@/lib/onboarding/triggers";

const INITIAL_SEEN_KEY = seenKey("initial");

export function OnboardingInfoButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        setShow(window.localStorage.getItem(INITIAL_SEEN_KEY) === "1");
      } catch {
        setShow(false);
      }
    };

    sync();

    // Re-check when storage changes (cross-tab) or a coach is dismissed (same tab)
    window.addEventListener("storage", sync);
    window.addEventListener(ONBOARDING_DISMISS_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(ONBOARDING_DISMISS_EVENT, sync);
    };
  }, []);

  // Hide while the initial coach is replaying; re-show when it finishes (via dismiss event).
  useEffect(() => {
    const onReplay = () => setShow(false);
    window.addEventListener(ONBOARDING_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(ONBOARDING_REPLAY_EVENT, onReplay);
  }, []);

  if (!show) return null;

  const replay = () => {
    // The manager owns seen-key state; just ask it to replay.
    setShow(false);
    window.dispatchEvent(new CustomEvent(ONBOARDING_REPLAY_EVENT));
  };

  return (
    <button
      type="button"
      onClick={replay}
      aria-label="Replay tutorial"
      title="Replay tutorial"
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}
