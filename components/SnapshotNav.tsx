"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface SnapshotNavProps {
  currentVersion: number;
  totalVersions: number;
  onChange: (version: number) => void;
}

export function SnapshotNav({ currentVersion, totalVersions, onChange }: SnapshotNavProps) {
  if (totalVersions <= 1) return null;

  const isOldest = currentVersion === 1;
  const isLatest = currentVersion === totalVersions;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <button
        type="button"
        onClick={() => onChange(currentVersion - 1)}
        disabled={isOldest}
        aria-label="Previous version"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <span className="text-sm font-medium text-muted-foreground tabular-nums">
        v{currentVersion} of {totalVersions}
      </span>

      <button
        type="button"
        onClick={() => onChange(currentVersion + 1)}
        disabled={isLatest}
        aria-label="Next version"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
