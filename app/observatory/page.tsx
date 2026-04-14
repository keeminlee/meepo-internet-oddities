import Link from "next/link";

import { MeepField } from "@/components/MeepField";
import { MilestoneRow } from "@/components/MilestoneRow";
import { BRAND } from "@/lib/constants";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getCosmicState, listThresholds } from "@/lib/domain/cosmic";

const MEEP_FIELD_CAP = 2000;

export const dynamic = "force-dynamic";

export default function ObservatoryPage() {
  ensureBootstrapped();
  const cosmic = getCosmicState();
  const thresholds = listThresholds();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>
          </Link>
          <span className="text-sm text-muted-foreground">Observatory</span>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-12 space-y-12">
        {/* Total meeps */}
        <section className="text-center space-y-4">
          <MeepField
            count={cosmic.total_meeps}
            className="w-full h-56 md:h-64"
          />
          <h1 className="font-display text-4xl font-bold md:text-5xl">
            {cosmic.total_meeps.toLocaleString()}
          </h1>
          <p className="text-lg text-muted-foreground">
            meeps in the universe — the energy flowing through {BRAND.name}
          </p>
          {cosmic.total_meeps > MEEP_FIELD_CAP && (
            <p className="text-xs text-muted-foreground">
              visualizing {MEEP_FIELD_CAP.toLocaleString()} of {cosmic.total_meeps.toLocaleString()}
            </p>
          )}
        </section>

        {/* Progress to next milestone */}
        {cosmic.next_threshold && (
          <section className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Next milestone: <span className="text-primary">{cosmic.next_threshold.label}</span>
              </span>
              <span className="text-muted-foreground tabular-nums">
                {cosmic.total_meeps.toLocaleString()} / {cosmic.next_threshold.meep_target.toLocaleString()}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${cosmic.next_threshold.progress_pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {cosmic.next_threshold.progress_pct}% — {(cosmic.next_threshold.meep_target - cosmic.total_meeps).toLocaleString()} meeps to go
            </p>
          </section>
        )}

        {!cosmic.next_threshold && cosmic.total_meeps > 0 && (
          <section className="text-center">
            <p className="text-primary font-medium">All milestones reached ✦</p>
          </section>
        )}

        {/* Milestone timeline */}
        {thresholds.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-2xl font-bold">Milestones</h2>
            <div className="space-y-0">
              {thresholds.map((t, i) => (
                <MilestoneRow
                  key={t.id}
                  threshold={t}
                  cosmicMeeps={cosmic.total_meeps}
                  isLast={i === thresholds.length - 1}
                />
              ))}
            </div>
          </section>
        )}

        {thresholds.length === 0 && (
          <section className="text-center text-muted-foreground">
            <p>No milestones set yet. The observatory is empty.</p>
          </section>
        )}

        <div className="text-center pt-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to the observatory
          </Link>
        </div>
      </main>
    </div>
  );
}

