"use client";

import { Check, Lock } from "lucide-react";

import { LovesPreviewDialog } from "@/components/LovesPreviewDialog";
import type { Threshold } from "@/lib/domain/cosmic";

interface Props {
  threshold: Threshold;
  cosmicMeeps: number;
  isLast: boolean;
}

export function MilestoneRow({ threshold, cosmicMeeps, isLast }: Props) {
  const isLoves = /love/i.test(threshold.label);
  const row = <MilestoneRowBody threshold={threshold} cosmicMeeps={cosmicMeeps} isLast={isLast} clickable={isLoves} />;
  if (!isLoves) return row;
  return <LovesPreviewDialog>{row}</LovesPreviewDialog>;
}

function MilestoneRowBody({
  threshold,
  cosmicMeeps,
  isLast,
  clickable,
}: Props & { clickable: boolean }) {
  const reached = threshold.unlocked;
  const progressPct = threshold.meep_target === 0
    ? 100
    : Math.min(100, Math.round((cosmicMeeps / threshold.meep_target) * 100));

  const Tag = clickable ? "button" : "div";

  return (
    <Tag
      type={clickable ? "button" : undefined}
      className={`flex w-full gap-4 text-left ${
        clickable ? "rounded-md transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60" : ""
      }`}
    >
      {/* Timeline column */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
            reached
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground"
          }`}
        >
          {reached ? <Check className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-8 ${reached ? "bg-primary/40" : "bg-border"}`} />
        )}
      </div>

      {/* Content */}
      <div className={`pb-6 ${reached ? "" : "opacity-70"}`}>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold">{threshold.label}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {threshold.meep_target.toLocaleString()} meeps
          </span>
          {clickable && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Preview
            </span>
          )}
        </div>
        {reached && threshold.unlocked_at && (
          <p className="text-xs text-primary mt-0.5">
            Reached {new Date(threshold.unlocked_at).toLocaleDateString()}
          </p>
        )}
        {!reached && (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/50 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">{progressPct}%</span>
          </div>
        )}
      </div>
    </Tag>
  );
}
