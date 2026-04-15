"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DraftControlProps {
  slug: string;
}

/**
 * DraftControl — plus-marked right-edge affordance.
 * Visible only when the parent confirms: owner + viewing latest published snapshot.
 * On click: POST /api/projects/[slug]/snapshots to create draft.
 * 409 → navigate to existing draft. 201 → navigate to draft editor.
 */
export function DraftControl({ slug }: DraftControlProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${slug}/snapshots`, { method: "POST" });
      if (res.status === 201 || res.ok) {
        router.push(`/project/${slug}/draft`);
        return;
      }
      if (res.status === 409) {
        // Draft already exists — navigate to it.
        router.push(`/project/${slug}/draft`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create draft");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2">
      <div className="group relative">
        <button
          onClick={handleClick}
          disabled={loading}
          aria-label="Post an update"
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-lg transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-6 w-6" />
        </button>
        {/* Hover label */}
        <span className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          Post an update
        </span>
      </div>
      {error && (
        <p className="max-w-[160px] rounded-md bg-destructive/10 px-2 py-1 text-center text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
