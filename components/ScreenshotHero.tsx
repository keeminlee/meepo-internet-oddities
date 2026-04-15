"use client";

import { useRef, useState } from "react";
import type { SnapshotScreenshot } from "@/lib/types/snapshot";

interface ScreenshotHeroProps {
  screenshots: SnapshotScreenshot[];
  editing?: boolean;
  slug?: string;
  onMutated?: () => void;
}

/**
 * Hero-style screenshot display.
 * - View mode: full-width 16:9 container, large overlay chevrons, dot indicators.
 * - Edit mode: X remove button, ←/→ reorder buttons, + Add screenshot affordance.
 * - Zero screenshots + not editing: renders nothing.
 * - Zero screenshots + editing: empty-state placeholder with add CTA.
 */
export function ScreenshotHero({ screenshots, editing = false, slug, onMutated }: ScreenshotHeroProps) {
  const sorted = [...screenshots].sort((a, b) => a.position - b.position);
  const [index, setIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Clamp index when screenshot list changes.
  const safeIndex = sorted.length > 0 ? Math.min(index, sorted.length - 1) : 0;
  const current = sorted[safeIndex];
  const hasMultiple = sorted.length > 1;

  const base = slug ? `/api/projects/${slug}/current-snapshot/screenshots` : null;

  function prev() {
    setIndex((i) => (i - 1 + sorted.length) % sorted.length);
  }
  function next() {
    setIndex((i) => (i + 1) % sorted.length);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!base) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("screenshot", file);
      const res = await fetch(base, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onMutated?.();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove(id: string) {
    if (!base) return;
    setError(null);
    const res = await fetch(`${base}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Remove failed");
      return;
    }
    // Adjust index if we removed the last item.
    setIndex((i) => Math.max(0, i >= sorted.length - 1 ? sorted.length - 2 : i));
    onMutated?.();
  }

  async function handleMove(id: string, direction: "left" | "right") {
    if (!base) return;
    setError(null);
    const idx = sorted.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const targetIdx = direction === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const target = sorted[targetIdx];
    const res = await fetch(`${base}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: target.position }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Reorder failed");
      return;
    }
    setIndex(targetIdx);
    onMutated?.();
  }

  const atMax = sorted.length >= 3;

  // Nothing to show and not editing.
  if (sorted.length === 0 && !editing) return null;

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {sorted.length === 0 && editing ? (
        // Empty-state placeholder.
        <div className="relative flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
          <label className={`flex cursor-pointer flex-col items-center gap-2 text-sm text-muted-foreground ${uploading ? "opacity-50" : "hover:text-foreground"}`}>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              onChange={handleUpload}
              className="sr-only"
            />
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>{uploading ? "Uploading…" : "+ Add screenshot"}</span>
          </label>
        </div>
      ) : (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
          {/* Main image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.id}
            src={current.url}
            alt={current.alt_text || "Screenshot"}
            className="h-full w-full object-cover"
          />

          {/* Edit mode overlays */}
          {editing && (
            <>
              {/* Remove button — top-right */}
              <button
                onClick={() => handleRemove(current.id)}
                aria-label="Remove screenshot"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-destructive"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>

              {/* Reorder arrows — bottom-left, only when multiple */}
              {hasMultiple && (
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <button
                    onClick={() => handleMove(current.id, "left")}
                    disabled={safeIndex === 0}
                    aria-label="Move screenshot left"
                    className="flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white transition-colors hover:bg-black/80 disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <button
                    onClick={() => handleMove(current.id, "right")}
                    disabled={safeIndex === sorted.length - 1}
                    aria-label="Move screenshot right"
                    className="flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white transition-colors hover:bg-black/80 disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Left/right nav chevrons — view mode and edit mode when multiple */}
          {hasMultiple && (
            <>
              <button
                onClick={prev}
                aria-label="Previous screenshot"
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button
                onClick={next}
                aria-label="Next screenshot"
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </>
          )}

          {/* Dot indicators — bottom-center */}
          {hasMultiple && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {sorted.map((ss, i) => (
                <button
                  key={ss.id}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to screenshot ${i + 1}`}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === safeIndex ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add screenshot affordance in edit mode when already have some but not at max */}
      {editing && sorted.length > 0 && !atMax && (
        <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors ${uploading ? "cursor-not-allowed opacity-50" : "hover:border-foreground/40 hover:bg-muted/20 hover:text-foreground"}`}>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={handleUpload}
            className="sr-only"
          />
          {uploading ? "Uploading…" : "+ Add screenshot"}
        </label>
      )}
    </div>
  );
}
