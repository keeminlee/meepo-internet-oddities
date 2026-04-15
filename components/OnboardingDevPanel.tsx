"use client";

import { Bug, Play, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ONBOARDING_FORCE_EVENT } from "@/components/OnboardingTriggerManager";
import { seenKey, TRIGGERS } from "@/lib/onboarding/triggers";

interface Props {
  initialBalance: number;
  isAuthenticated: boolean;
}

/**
 * Floating dev-only panel: inspect and reset onboarding seen-flags, and override
 * the current user's meep_balance for trigger testing. Rendered only when
 * NODE_ENV === "development".
 */
export function OnboardingDevPanel({ initialBalance, isAuthenticated }: Props) {
  const [open, setOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState<string>(String(initialBalance));
  const [seenMap, setSeenMap] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refreshSeen = () => {
    const next: Record<string, boolean> = {};
    try {
      for (const t of TRIGGERS) {
        next[t.id] = window.localStorage.getItem(seenKey(t.id)) === "1";
      }
    } catch {
      // localStorage disabled
    }
    setSeenMap(next);
  };

  useEffect(() => {
    if (open) refreshSeen();
  }, [open]);

  const resetTrigger = (id: string) => {
    try {
      window.localStorage.removeItem(seenKey(id));
    } catch {
      // noop
    }
    refreshSeen();
  };

  const resetAll = () => {
    try {
      for (const t of TRIGGERS) window.localStorage.removeItem(seenKey(t.id));
    } catch {
      // noop
    }
    refreshSeen();
  };

  const playTrigger = (id: string) => {
    window.dispatchEvent(new CustomEvent(ONBOARDING_FORCE_EVENT, { detail: { id } }));
  };

  const applyBalance = async () => {
    const n = Number(balanceInput);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      setStatus("balance must be a non-negative integer");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/dev/set-meeps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ balance: n }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setStatus(`balance = ${n}. Reload to re-evaluate triggers.`);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reload = () => window.location.reload();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open onboarding dev panel"
        title="Onboarding dev panel"
        className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-muted"
      >
        <Bug className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between pb-2">
        <h3 className="font-display text-sm font-bold">Onboarding dev panel</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close dev panel"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 text-xs">
        <section className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-medium">Meep balance</span>
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              title="Reload to re-evaluate triggers"
            >
              <RefreshCw className="h-3 w-3" /> reload
            </button>
          </div>
          {!isAuthenticated ? (
            <p className="text-muted-foreground">Sign in to override balance.</p>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                className="w-20 rounded border border-border bg-background px-2 py-1 text-xs"
              />
              <Button size="sm" onClick={applyBalance} disabled={busy}>
                Set
              </Button>
            </div>
          )}
          {status && <p className="text-[11px] text-muted-foreground">{status}</p>}
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-medium">Triggers</span>
            <button
              type="button"
              onClick={resetAll}
              className="text-muted-foreground hover:text-foreground"
            >
              reset all
            </button>
          </div>
          <ul className="space-y-1">
            {TRIGGERS.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-md border border-border px-2 py-1"
              >
                <div className="flex flex-col">
                  <span className="font-mono text-[11px]">{t.id}</span>
                  <span className="text-[10px] text-muted-foreground">
                    threshold ≥ {t.threshold} · {t.audience ?? "all"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      seenMap[t.id]
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {seenMap[t.id] ? "seen" : "unseen"}
                  </span>
                  <button
                    type="button"
                    onClick={() => playTrigger(t.id)}
                    aria-label={`Preview ${t.id}`}
                    title="Preview this trigger (does not mark seen)"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Play className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => resetTrigger(t.id)}
                    className="text-[11px] text-primary hover:underline"
                    disabled={!seenMap[t.id]}
                  >
                    reset
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
