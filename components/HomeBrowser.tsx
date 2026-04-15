"use client";

import { useEffect, useMemo, useState } from "react";

import type { ProjectWithCreator } from "@/lib/domain/types";

import { ProjectCard } from "./ProjectCard";
import { TagFilter } from "./TagFilter";

type TabId = "newest" | "most_loved";

interface HomeBrowserProps {
  newest: ProjectWithCreator[];
  mostLoved: ProjectWithCreator[];
  /** Project ids the viewer can currently mint a meep from. Empty when the
   *  viewer is anonymous, has hit the daily cap, or owns/already-minted all
   *  visible projects. Drives the persistent emerald outline on eligible cards. */
  eligibleProjectIds: string[];
  /** Project ids the viewer has already visited today — excluded from Newest. */
  visitedTodayIds?: string[];
}

const TABS: { id: TabId; label: string; subtitle: string }[] = [
  { id: "newest", label: "Newest", subtitle: "New artifacts from strange minds" },
  { id: "most_loved", label: "Most loved", subtitle: "Projects you've sent the most meeps to" },
];

export function HomeBrowser({
  newest,
  mostLoved,
  eligibleProjectIds,
  visitedTodayIds = [],
}: HomeBrowserProps) {
  const [tab, setTab] = useState<TabId>("newest");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const eligibleSet = useMemo(() => new Set(eligibleProjectIds), [eligibleProjectIds]);
  const visitedSet = useMemo(() => new Set(visitedTodayIds), [visitedTodayIds]);

  // Listen for coach tab-switch events from CoachBubbles.
  useEffect(() => {
    const onActivateTab = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string }>).detail;
      if (detail?.tab === "newest" || detail?.tab === "most_loved") {
        setTab(detail.tab);
      }
    };
    window.addEventListener("meepo:coach-activate-tab", onActivateTab);
    return () => window.removeEventListener("meepo:coach-activate-tab", onActivateTab);
  }, []);

  // Filter visited-today projects out of Newest tab.
  const filteredNewest = useMemo(
    () => newest.filter((p) => !visitedSet.has(p.id)),
    [newest, visitedSet],
  );

  const source = tab === "newest" ? filteredNewest : mostLoved;
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
            id={`tab-${t.id}`}
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
        eligibleSet={eligibleSet}
        title={activeTag ? `${activeMeta.label} · tagged "${activeTag}"` : activeMeta.label}
        subtitle={
          activeTag
            ? `${filtered.length} project${filtered.length !== 1 ? "s" : ""} in ${activeMeta.label.toLowerCase()}`
            : activeMeta.subtitle
        }
        emptyMessage={
          tab === "most_loved"
            ? "No projects here yet. Go explore a project — it'll appear here once you've sent it a meep."
            : "No projects here yet."
        }
      />
    </>
  );
}

function ProjectGrid({
  items,
  eligibleSet,
  title,
  subtitle,
  emptyMessage,
}: {
  items: ProjectWithCreator[];
  eligibleSet: Set<string>;
  title: string;
  subtitle?: string;
  emptyMessage?: string;
}) {
  return (
    <section id="projects" className="space-y-6 scroll-mt-20">
      <div>
        <h2 className="font-display text-2xl font-bold md:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
          {emptyMessage ?? "No projects here yet."}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              eligibleForMeep={eligibleSet.has(p.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
