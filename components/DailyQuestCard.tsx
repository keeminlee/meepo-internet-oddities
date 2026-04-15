"use client";

import { Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface QuestData {
  authenticated: boolean;
  used: number;
  remaining: number;
  cap: number;
  handle: string | null;
}

/**
 * Mirrors MeepoCard's load-with-fallbacks pattern: renders immediately with
 * placeholder values, then hydrates when /api/me/quest responds. Gating on
 * authentication + balance happens at the homepage level — this component
 * assumes it should render.
 */
export function DailyQuestCard() {
  const [data, setData] = useState<QuestData | null>(null);
  // Animate progress bar from 0 to target on first render with used > 0.
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/me/quest", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (!cancelled) setData(j as QuestData);
        })
        .catch(() => undefined);
    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const cap = data?.cap ?? 10;
  const used = data?.used ?? 0;
  const pct = Math.round((used / cap) * 100);
  const complete = used >= cap;

  // On first data load with used > 0, animate bar from 0 → target.
  useEffect(() => {
    if (data === null) return;
    // Use a short delay so the initial 0-width paint is committed first.
    const t = setTimeout(() => setDisplayPct(pct), 50);
    return () => clearTimeout(t);
  }, [data, pct]);

  return (
    // Mirrors the hero's "Explore the universe" CTA: scrolls the viewport
    // to the discover project grid where clicks actually earn meeps.
    <Link
      href="#projects"
      className="group block h-full overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-emerald-500/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/50"
    >
      <div className="relative overflow-hidden aspect-[3/1] flex items-center justify-center bg-gradient-to-br from-emerald-500/10 to-transparent">
        <div className="text-center space-y-1">
          <Target className="h-8 w-8 text-emerald-500 mx-auto opacity-80" />
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-500/70">
            Daily Quest
          </p>
        </div>
      </div>

      <div className="flex flex-col flex-1 space-y-3 p-4">
        <div>
          <h3 className="font-display text-lg font-bold leading-tight transition-colors group-hover:text-emerald-500">
            {complete ? "Quest complete!" : "Explore & click"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {complete
              ? `You've used all ${cap} clicks today. Come back tomorrow!`
              : "Click on distinct projects to earn meeps. Resets daily."}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-medium text-foreground tabular-nums text-sm">
              {used}/{cap}
            </span>
            <span>meeps earned</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-[1500ms] ease-in-out ${
                complete ? "bg-emerald-500" : "bg-emerald-500/70"
              }`}
              style={{ width: `${displayPct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
