"use client";

import { HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { ONBOARDING_DISMISS_EVENT, ONBOARDING_REPLAY_EVENT, ONBOARDING_STORAGE_KEY } from "@/components/OnboardingBubbles";

export function OnboardingInfoButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        setShow(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1");
      } catch {
        setShow(false);
      }
    };

    sync();

    // Re-check when storage changes (cross-tab) or onboarding is dismissed (same tab)
    window.addEventListener("storage", sync);
    window.addEventListener(ONBOARDING_DISMISS_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(ONBOARDING_DISMISS_EVENT, sync);
    };
  }, []);

  // Also hide when onboarding replays, re-show when it finishes
  useEffect(() => {
    const onReplay = () => setShow(false);
    window.addEventListener(ONBOARDING_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(ONBOARDING_REPLAY_EVENT, onReplay);
  }, []);

  if (!show) return null;

  const replay = () => {
    try {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      /* ignore */
    }
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
