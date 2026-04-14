// Cosmic state + threshold progress reader. Read-only — the only writer of
// `cosmic_state.total_meeps` is `countedClick` (step 2); the only writer of
// `thresholds` is the admin UI (step 4).

import { getDb } from "../db";

export interface ThresholdRow {
  id: string;
  meep_target: number;
  label: string;
  feature_key: string;
  unlocked: number; // 0/1
  unlocked_at: string;
}

export interface Threshold extends Omit<ThresholdRow, "unlocked"> {
  unlocked: boolean;
}

export interface CosmicSnapshot {
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

export function getCosmicState(): CosmicSnapshot {
  const db = getDb();
  const state = db
    .prepare<[], { total_meeps: number; current_threshold: string }>(
      "SELECT total_meeps, current_threshold FROM cosmic_state WHERE id = 1",
    )
    .get() ?? { total_meeps: 0, current_threshold: "" };

  const next = db
    .prepare<[number], ThresholdRow>(
      "SELECT * FROM thresholds WHERE unlocked = 0 AND meep_target > ? ORDER BY meep_target ASC LIMIT 1",
    )
    .get(state.total_meeps);

  const snapshot: CosmicSnapshot = {
    total_meeps: state.total_meeps,
    current_threshold: state.current_threshold,
    next_threshold: null,
  };

  if (next) {
    const pct = next.meep_target === 0
      ? 100
      : Math.min(100, Math.max(0, Math.round((state.total_meeps / next.meep_target) * 100)));
    snapshot.next_threshold = {
      id: next.id,
      label: next.label,
      meep_target: next.meep_target,
      feature_key: next.feature_key,
      progress_pct: pct,
    };
  }

  return snapshot;
}

export function listThresholds(): Threshold[] {
  const rows = getDb()
    .prepare<[], ThresholdRow>("SELECT * FROM thresholds ORDER BY meep_target ASC")
    .all();
  return rows.map((r) => ({ ...r, unlocked: !!r.unlocked }));
}
