"use client";

interface CadenceGateProps {
  /** ISO string of the last published snapshot, or null if none. */
  lastPublishedAt: string | null;
  /** Rendered when cadence blocks publishing. */
  children: (blocked: boolean, nextEligibleAt: string | null) => React.ReactNode;
}

const THREE_DAYS_MS = 72 * 60 * 60 * 1000;

/**
 * CadenceGate — computes whether the 3-day publish cadence is met.
 * Uses a render-prop so the parent controls layout.
 * If lastPublishedAt is null, never blocked (first publish).
 */
export function CadenceGate({ lastPublishedAt, children }: CadenceGateProps) {
  if (!lastPublishedAt) {
    return <>{children(false, null)}</>;
  }

  const lastMs = new Date(lastPublishedAt).getTime();
  const nowMs = Date.now();
  const blocked = nowMs - lastMs < THREE_DAYS_MS;
  const nextEligibleAt = blocked
    ? new Date(lastMs + THREE_DAYS_MS).toISOString()
    : null;

  return <>{children(blocked, nextEligibleAt)}</>;
}

/** Formats a next-eligible ISO date into a human-readable string. */
export function formatNextEligible(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
