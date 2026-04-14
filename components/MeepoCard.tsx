"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface CosmicSnapshot {
  total_meeps: number;
  current_threshold: string;
  next_threshold: {
    id: string;
    label: string;
    meep_target: number;
    progress_pct: number;
  } | null;
}

/**
 * Special pinned card for Meepo itself. Visually distinct from ProjectCard.
 * Routes to /observatory instead of an external link.
 * NOT part of the meep economy — clicking this does NOT trigger counted clicks.
 */
export function MeepoCard() {
  const [data, setData] = useState<CosmicSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/cosmic", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (!cancelled) setData(j as CosmicSnapshot);
        })
        .catch(() => undefined);
    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const meeps = data?.total_meeps ?? 0;
  const next = data?.next_threshold;

  return (
    <Link
      href="/observatory"
      className="group block h-full overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-primary/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50"
    >
      <div className="relative overflow-hidden aspect-[3/1] flex items-center justify-center bg-gradient-to-br from-primary/10 to-transparent">
        <div className="text-center space-y-1">
          <Sparkles className="h-8 w-8 text-primary mx-auto opacity-80" />
          <p className="text-xs font-medium uppercase tracking-widest text-primary/70">
            Observatory
          </p>
        </div>
      </div>

      <div className="flex flex-col flex-1 space-y-3 p-4">
        <div>
          <h3 className="font-display text-lg font-bold leading-tight transition-colors group-hover:text-primary">
            Meepo
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Every click on a distinct project feeds the universal total.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground tabular-nums text-sm">
              {meeps.toLocaleString()}
            </span>
            <span>meeps in the universe</span>
          </div>

          {next && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Next: {next.label}</span>
                <span className="tabular-nums">{next.progress_pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${next.progress_pct}%` }}
                />
              </div>
            </div>
          )}

          {!next && meeps > 0 && (
            <p className="text-[11px] text-primary/70 font-medium">
              All milestones reached ✦
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
