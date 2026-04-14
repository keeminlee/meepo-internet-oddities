"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectWithCreator } from "@/lib/domain/types";

import { StatusBadge } from "./StatusBadge";
import { TagBadge } from "./TagBadge";

export function AdminQueue({ initial }: { initial: ProjectWithCreator[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string>("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>("");

  const approve = async (slug: string) => {
    setBusy(slug);
    setError("");
    try {
      const res = await fetch(`/api/review/${encodeURIComponent(slug)}/approve`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setItems((prev) => prev.filter((p) => p.slug !== slug));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy("");
    }
  };

  const reject = async (slug: string) => {
    setBusy(slug);
    setError("");
    try {
      const res = await fetch(`/api/review/${encodeURIComponent(slug)}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason[slug] ?? "" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setItems((prev) => prev.filter((p) => p.slug !== slug));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusy("");
    }
  };

  if (items.length === 0) {
    return <p className="text-muted-foreground">No pending submissions.</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {items.map((p) => (
        <article key={p.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold">{p.name}</h3>
              <p className="text-sm text-muted-foreground">{p.one_line_pitch}</p>
            </div>
            <StatusBadge status={p.status} />
          </header>
          <div className="text-sm text-muted-foreground">
            By {p.creator?.display_name ?? "Unknown"}
            {p.creator?.handle ? ` @${p.creator.handle}` : ""} · slug: <code>{p.slug}</code>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <TagBadge key={t} tag={t} size="sm" />
            ))}
          </div>
          {p.external_url && (
            <div className="text-xs">
              <a
                href={p.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {p.external_url}
              </a>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <Textarea
              placeholder="Rejection reason (optional)"
              value={reason[p.slug] ?? ""}
              onChange={(e) => setReason((r) => ({ ...r, [p.slug]: e.target.value }))}
              rows={2}
              className="sm:flex-1"
            />
            <div className="flex gap-2">
              <Button onClick={() => approve(p.slug)} disabled={busy === p.slug} size="sm">
                Approve
              </Button>
              <Button
                onClick={() => reject(p.slug)}
                disabled={busy === p.slug}
                size="sm"
                variant="outline"
              >
                Reject
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
