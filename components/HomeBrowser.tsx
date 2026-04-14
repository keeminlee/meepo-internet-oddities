"use client";

import { useMemo, useState } from "react";

import type { ProjectWithCreator } from "@/lib/domain/types";

import { ProjectCard } from "./ProjectCard";
import { TagFilter } from "./TagFilter";

interface HomeBrowserProps {
  featured: ProjectWithCreator[];
  newest: ProjectWithCreator[];
  all: ProjectWithCreator[];
}

export function HomeBrowser({ featured, newest, all }: HomeBrowserProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeTag) return [];
    return all.filter((p) => p.tags.includes(activeTag));
  }, [activeTag, all]);

  return (
    <>
      <div className="space-y-4">
        <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Discover by vibe
        </p>
        <TagFilter activeTag={activeTag} onTagChange={setActiveTag} />
      </div>

      {activeTag ? (
        <ProjectGrid
          items={filtered}
          title={`Tagged "${activeTag}"`}
          subtitle={`${filtered.length} meep${filtered.length !== 1 ? "s" : ""}`}
        />
      ) : (
        <>
          <ProjectGrid
            items={featured}
            title="Featured meeps"
            subtitle="Curated for voice, taste, and singularity"
          />
          <ProjectGrid
            items={newest}
            title="Fresh meeps"
            subtitle="New artifacts from strange minds"
          />
        </>
      )}
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
  if (items.length === 0) return null;
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold md:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </section>
  );
}
