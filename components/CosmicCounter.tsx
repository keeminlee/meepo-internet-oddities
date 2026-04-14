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
    feature_key: string;
    progress_pct: number;
  } | null;
}

export function CosmicCounter() {
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
    // Light polling so clicks from other users tick the visible counter forward.
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <div className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
        <Sparkles className="h-3.5 w-3.5" /> …
      </div>
    );
  }

  const has = data.next_threshold !== null;
  return (
    <Link
      href="/observatory"
      className="group hidden items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted sm:inline-flex"
      title={
        has
          ? `Next milestone: ${data.next_threshold!.label} at ${data.next_threshold!.meep_target} cosmic meeps`
          : "Cosmic meeps — all milestones reached"
      }
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span className="tabular-nums text-foreground">{data.total_meeps.toLocaleString()}</span>
      <span>cosmic meeps</span>
      {has && data.next_threshold && (
        <span className="ml-1 hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted md:inline-block">
          <span
            className="block h-full bg-primary transition-all"
            style={{ width: `${data.next_threshold.progress_pct}%` }}
          />
        </span>
      )}
    </Link>
  );
}
