import { useState } from "react";
import { BRAND } from "@/lib/constants";
import { ProjectTag } from "@/lib/constants";
import { ProjectCard } from "@/components/ProjectCard";
import { TagFilter } from "@/components/TagFilter";
import { SubmitDialog } from "@/components/SubmitDialog";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@/hooks/use-auth";
import {
  getFeaturedProjects,
  getNewestProjects,
  getSeekingUsersProjects,
  filterByTag,
} from "@/data/projects";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowDown } from "lucide-react";

function ProjectGrid({ items, title, subtitle }: { items: any[]; title: string; subtitle?: string }) {
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

export default function Index() {
  const [activeTag, setActiveTag] = useState<ProjectTag | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const featured = getFeaturedProjects();
  const newest = getNewestProjects(6);
  const seeking = getSeekingUsersProjects();
  const filtered = activeTag ? filterByTag(activeTag) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <span className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>
          </span>
          <div className="flex items-center gap-3">
            <AuthButton />
            <Button size="sm" onClick={() => setSubmitOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Post your meep
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 text-center md:py-32">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        <div className="relative mx-auto max-w-3xl space-y-6">
          <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
            {BRAND.name}
          </h1>
          <p className="text-xl text-muted-foreground md:text-2xl">
            {BRAND.tagline}
          </p>
          <p className="mx-auto max-w-xl text-muted-foreground">
            {BRAND.description}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => setSubmitOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Post your meep
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() =>
                document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <ArrowDown className="h-4 w-4" />
              Explore the observatory
            </Button>
          </div>
        </div>
        <div className="mt-6 text-sm text-muted-foreground">
          Authorship is the feature.
        </div>
      </section>

      {/* Main content */}
      <main id="discover" className="container mx-auto space-y-16 px-4 pb-20">
        {/* Tag filter */}
        <div className="space-y-4">
          <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Discover by vibe
          </p>
          <TagFilter activeTag={activeTag} onTagChange={setActiveTag} />
        </div>

        {/* Filtered view */}
        {filtered ? (
          <ProjectGrid
            items={filtered}
            title={`Tagged "${activeTag}"`}
            subtitle={`${filtered.length} meep${filtered.length !== 1 ? "s" : ""}`}
          />
        ) : (
          <>
            <ProjectGrid
              items={featured}
              title="Featured transmissions"
              subtitle="Curated for voice, taste, and singularity"
            />
            <ProjectGrid
              items={newest}
              title="Fresh arrivals"
              subtitle="New artifacts from strange minds"
            />
            <ProjectGrid
              items={seeking}
              title="Needs first believers"
              subtitle="Meeps seeking curious users and collaborators"
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>{BRAND.footerLine}</p>
      </footer>

      <SubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} />
    </div>
  );
}
