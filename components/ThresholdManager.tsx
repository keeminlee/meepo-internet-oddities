"use client";

import { Check, Lock, Plus, Trash, Unlock } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Threshold {
  id: string;
  meep_target: number;
  label: string;
  feature_key: string;
  unlocked: boolean;
  unlocked_at: string;
}

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

export function ThresholdManager() {
  const [list, setList] = useState<Threshold[]>([]);
  const [cosmic, setCosmic] = useState<CosmicSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ meep_target: "", label: "", feature_key: "" });

  const refresh = async () => {
    try {
      const [tRes, cRes] = await Promise.all([
        fetch("/api/thresholds", { cache: "no-store" }),
        fetch("/api/cosmic", { cache: "no-store" }),
      ]);
      if (tRes.ok) setList((await tRes.json()) as Threshold[]);
      if (cRes.ok) setCosmic((await cRes.json()) as CosmicSnapshot);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy("create");
    try {
      const res = await fetch("/api/thresholds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meep_target: Number(form.meep_target),
          label: form.label,
          feature_key: form.feature_key,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Create failed");
      setForm({ meep_target: "", label: "", feature_key: "" });
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy("");
    }
  };

  const toggleUnlock = async (t: Threshold) => {
    setBusy(`toggle-${t.id}`);
    setError("");
    try {
      const res = await fetch(`/api/thresholds/${encodeURIComponent(t.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlocked: !t.unlocked }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Toggle failed");
    } finally {
      setBusy("");
    }
  };

  const remove = async (t: Threshold) => {
    if (!window.confirm(`Delete threshold "${t.label}"?`)) return;
    setBusy(`del-${t.id}`);
    setError("");
    try {
      const res = await fetch(`/api/thresholds/${encodeURIComponent(t.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold">Thresholds</h2>
        <p className="text-sm text-muted-foreground">
          Milestone gates. Feature flags unlock when the total meep count crosses a threshold.
        </p>
      </div>

      {cosmic && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Global state</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {cosmic.total_meeps.toLocaleString()} meeps in the universe
          </p>
          {cosmic.next_threshold ? (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Next: {cosmic.next_threshold.label}</span>
                <span>
                  {cosmic.total_meeps} / {cosmic.next_threshold.meep_target}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${cosmic.next_threshold.progress_pct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">All thresholds reached.</p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={create} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_2fr_1fr_auto]">
        <div className="space-y-1">
          <Label htmlFor="th-target">Meep target</Label>
          <Input
            id="th-target"
            type="number"
            min={0}
            value={form.meep_target}
            onChange={(e) => setForm((f) => ({ ...f, meep_target: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="th-label">Label</Label>
          <Input
            id="th-label"
            value={form.label}
            placeholder="e.g. Loves unlock"
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="th-key">Feature key</Label>
          <Input
            id="th-key"
            value={form.feature_key}
            placeholder="e.g. loves_enabled"
            onChange={(e) => setForm((f) => ({ ...f, feature_key: e.target.value }))}
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy === "create"}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </form>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No thresholds yet. Add one above.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <span className="font-mono tabular-nums text-sm">
                {t.meep_target.toLocaleString()}
              </span>
              <span className="flex-1 text-sm font-medium">{t.label}</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{t.feature_key}</code>
              {t.unlocked ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                  <Check className="h-3.5 w-3.5" /> unlocked
                  {t.unlocked_at && (
                    <span className="text-muted-foreground">
                      {new Date(t.unlocked_at).toLocaleDateString()}
                    </span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> locked
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleUnlock(t)}
                disabled={busy === `toggle-${t.id}`}
                title={t.unlocked ? "Lock again" : "Mark unlocked"}
              >
                {t.unlocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(t)}
                disabled={busy === `del-${t.id}`}
                title="Delete threshold"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
