"use client";

import { useRef, useState } from "react";
import type { SnapshotScreenshot } from "@/lib/types/snapshot";

interface ScreenshotUploaderProps {
  projectSlug: string;
  initialScreenshots: SnapshotScreenshot[];
}

/**
 * Draft-mode screenshot manager.
 * - Shows current screenshots (up to 3) with remove + up/down reorder buttons.
 * - "Add screenshot" file input (disabled when 3 present).
 * - POSTs to /api/projects/[slug]/snapshots/draft/screenshots.
 * - DELETE/PATCH to /api/projects/[slug]/snapshots/draft/screenshots/[id].
 */
export function ScreenshotUploader({ projectSlug, initialScreenshots }: ScreenshotUploaderProps) {
  const [screenshots, setScreenshots] = useState<SnapshotScreenshot[]>(
    [...initialScreenshots].sort((a, b) => a.position - b.position),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const base = `/api/projects/${projectSlug}/snapshots/draft/screenshots`;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
      setScreenshots((prev) =>
        [...prev, data as SnapshotScreenshot].sort((a, b) => a.position - b.position),
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    const res = await fetch(`${base}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Remove failed");
      return;
    }
    setScreenshots((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleMove(id: string, direction: "up" | "down") {
    setError(null);
    const idx = screenshots.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= screenshots.length) return;

    const target = screenshots[targetIdx];
    const current = screenshots[idx];
    const newPosition = target.position;

    const res = await fetch(`${base}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: newPosition }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Reorder failed");
      return;
    }
    const updated = (await res.json()) as SnapshotScreenshot;

    // Optimistic local swap.
    setScreenshots((prev) => {
      const next = prev.map((s) => {
        if (s.id === id) return updated;
        if (s.id === target.id) return { ...current, position: current.position };
        return s;
      });
      // Re-fetch to get server truth — simpler than full optimistic swap for 3 items.
      void fetch(base.replace("/screenshots", ""))
        .then((r) => r.json())
        .then((draft) => {
          if (draft?.screenshots) {
            setScreenshots(
              [...(draft.screenshots as SnapshotScreenshot[])].sort((a, b) => a.position - b.position),
            );
          }
        })
        .catch(() => null);
      return next;
    });
  }

  const atMax = screenshots.length >= 3;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Screenshots ({screenshots.length}/3)</h3>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {screenshots.length > 0 && (
        <ul className="space-y-2">
          {screenshots.map((ss, i) => (
            <li key={ss.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
              {/* Thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ss.url}
                alt={ss.alt_text || "Screenshot"}
                className="h-12 w-20 flex-shrink-0 rounded object-cover"
              />
              {/* Position label */}
              <span className="text-xs text-muted-foreground">#{ss.position}</span>
              {/* Alt text */}
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {ss.alt_text || <em>no alt text</em>}
              </span>
              {/* Reorder */}
              <div className="flex gap-1">
                <button
                  onClick={() => handleMove(ss.id, "up")}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="flex h-6 w-6 items-center justify-center rounded border border-border text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMove(ss.id, "down")}
                  disabled={i === screenshots.length - 1}
                  aria-label="Move down"
                  className="flex h-6 w-6 items-center justify-center rounded border border-border text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
              {/* Remove */}
              <button
                onClick={() => handleRemove(ss.id)}
                aria-label="Remove screenshot"
                className="flex h-6 w-6 items-center justify-center rounded border border-border text-xs text-destructive hover:bg-destructive/10"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Upload input */}
      <label
        className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm transition-colors ${
          atMax || uploading
            ? "cursor-not-allowed opacity-50"
            : "hover:border-foreground/40 hover:bg-muted/20"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={atMax || uploading}
          onChange={handleUpload}
          className="sr-only"
        />
        {uploading ? "Uploading…" : atMax ? "Max 3 screenshots reached" : "+ Add screenshot"}
      </label>
    </div>
  );
}
