// Threshold CRUD — consumed by the admin API routes (step 4).

import { randomUUID } from "node:crypto";

import { getDb } from "../db";
import { type Threshold, type ThresholdRow } from "./cosmic";

export interface CreateThresholdInput {
  meep_target: number;
  label: string;
  feature_key: string;
}

export interface UpdateThresholdInput {
  meep_target?: number;
  label?: string;
  feature_key?: string;
  unlocked?: boolean;
}

function mapThreshold(row: ThresholdRow): Threshold {
  return { ...row, unlocked: !!row.unlocked };
}

export function listAllThresholds(): Threshold[] {
  return getDb()
    .prepare<[], ThresholdRow>("SELECT * FROM thresholds ORDER BY meep_target ASC")
    .all()
    .map(mapThreshold);
}

export function getThreshold(id: string): Threshold | null {
  const row = getDb()
    .prepare<[string], ThresholdRow>("SELECT * FROM thresholds WHERE id = ?")
    .get(id);
  return row ? mapThreshold(row) : null;
}

export function createThreshold(input: CreateThresholdInput): Threshold {
  const id = `thr-${randomUUID().slice(0, 8)}`;
  getDb()
    .prepare(
      "INSERT INTO thresholds (id, meep_target, label, feature_key, unlocked, unlocked_at) VALUES (?, ?, ?, ?, 0, '')",
    )
    .run(id, input.meep_target, input.label, input.feature_key);
  const created = getThreshold(id);
  if (!created) throw new Error("threshold creation failed");
  return created;
}

export function updateThreshold(id: string, patch: UpdateThresholdInput): Threshold | null {
  const existing = getThreshold(id);
  if (!existing) return null;

  const meep_target = patch.meep_target ?? existing.meep_target;
  const label = patch.label ?? existing.label;
  const feature_key = patch.feature_key ?? existing.feature_key;

  let unlocked = existing.unlocked ? 1 : 0;
  let unlocked_at = existing.unlocked_at;
  if (patch.unlocked !== undefined && patch.unlocked !== existing.unlocked) {
    unlocked = patch.unlocked ? 1 : 0;
    unlocked_at = patch.unlocked ? new Date().toISOString() : "";
  }

  getDb()
    .prepare(
      "UPDATE thresholds SET meep_target = ?, label = ?, feature_key = ?, unlocked = ?, unlocked_at = ? WHERE id = ?",
    )
    .run(meep_target, label, feature_key, unlocked, unlocked_at, id);

  return getThreshold(id);
}

export function deleteThreshold(id: string): boolean {
  const result = getDb().prepare("DELETE FROM thresholds WHERE id = ?").run(id);
  return result.changes > 0;
}

export const V0_SEED_THRESHOLD_ID = "thr-v0-loves";

export function seedV0Thresholds(): void {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO thresholds (id, meep_target, label, feature_key, unlocked, unlocked_at) VALUES (?, 100, 'Loves unlock', 'loves_enabled', 0, '')",
    )
    .run(V0_SEED_THRESHOLD_ID);
}
