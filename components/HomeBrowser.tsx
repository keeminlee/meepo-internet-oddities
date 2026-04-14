"use client";

import { useMemo, useState } from "react";

import type { ProjectWithCreator } from "@/lib/domain/types";

import { ProjectCard } from "./ProjectCard";
import { TagFilter } from "./TagFilter";

type TabId = "featured" | "newest" | "most_loved";

interface HomeBrowserProps {
  featured: ProjectWithCreator[];
  newest: ProjectWithCreator[];
  mostLoved: ProjectWithCreator[];
}

const TABS: { id: TabId; label: string; subtitle: string }[] = [
  { id: "featured", label: "Featured", subtitle: "Curated for voice, taste, and singularity" },
  { id: "newest", label: "Newest", subtitle: "New artifacts from strange minds" },
  { id: "most_loved", label: "Most loved", subtitle: "Highest meep count first" },
];

export function HomeBrowser({ featured, newest, mostLoved }: HomeBrowserProps) {
  const [tab, setTab] = useState<TabId>("featured");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const source = tab === "featured" ? featured : tab === "newest" ? newest : mostLoved;
  const filtered = useMemo(
    () => (activeTag ? source.filter((p) => p.tags.includes(activeTag)) : source),
    [activeTag, source],
  );

  const activeMeta = TABS.find((t) => t.id === tab)!;

  return (
    <>
      <div className="space-y-4">
        <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Discover by vibe
        </p>
        <TagFilter activeTag={activeTag} onTagChange={setActiveTag} />
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-2"
        role="tablist"
        aria-label="Homepage surfaces"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-foreground text-background border-foreground"
                : "bg-secondary text-secondary-foreground border-border hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ProjectGrid
        items={filtered}
        title={activeTag ? `${activeMeta.label} · tagged "${activeTag}"` : activeMeta.label}
        subtitle={
          activeTag
            ? `${filtered.length} meep${filtered.length !== 1 ? "s" : ""} in ${activeMeta.label.toLowerCase()}`
            : activeMeta.subtitle
        }
      />
    </>
  );
}

function ProjectGrid({
  items,
  title,
  subtitle,
}: {
  items: ProjectWithCreator[];
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold md:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
          No meeps here yet.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </section>
  );
}
