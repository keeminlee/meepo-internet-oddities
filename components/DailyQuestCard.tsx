"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface QuestData {
  authenticated: boolean;
  used: number;
  remaining: number;
  cap: number;
  handle: string | null;
}

export function DailyQuestCard() {
  const [data, setData] = useState<QuestData | null>(null);

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

  // Don't render for anonymous users
  if (!data || !data.authenticated) return null;

  const pct = Math.round((data.used / data.cap) * 100);
  const complete = data.used >= data.cap;
  const href = data.handle ? `/creator/${data.handle}` : "#";

  return (
    <Link
      href={href}
      className="group block h-full overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-emerald-500/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/50"
    >
      <div className="relative overflow-hidden aspect-[3/1] flex items-center justify-center bg-gradient-to-br from-emerald-500/10 to-transparent">
        <div className="text-center space-y-1">
          <Sparkles className="h-8 w-8 text-emerald-500 mx-auto opacity-80" />
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
              ? "You've used all 10 clicks today. Come back tomorrow!"
              : "Click on distinct projects to earn meeps. Resets daily."}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-medium text-foreground tabular-nums text-sm">
              {data.used}/{data.cap}
            </span>
            <span>meeps earned</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                complete ? "bg-emerald-500" : "bg-emerald-500/70"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
