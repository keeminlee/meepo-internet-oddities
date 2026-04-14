import { BRAND } from "@/lib/constants";
import { ProjectCard } from "@/components/ProjectCard";
import { projects } from "@/data/projects";
import type { ProjectWithCreator } from "@/types";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Map static demo data shape → API shape so ProjectCard works */
function toApiShape(p: (typeof projects)[number]): ProjectWithCreator {
  return {
    id: p.id,
    creator_id: "",
    slug: p.slug,
    name: p.name,
    project_avatar_url: "",
    one_line_pitch: p.pitch,
    screenshot_url: p.screenshot,
    external_url: p.url,
    status: p.status,
    tags: p.tags,
    built_with: p.builtWith,
    why_i_made_this: p.whyMade || "",
    about: p.about,
    clicks_sent: p.clicksSent,
    featured: p.featured || false,
    approved: true,
    created_at: p.createdAt,
    creator: {
      id: "",
      handle: (p.makerHandle || "").replace("@", ""),
      display_name: p.makerName,
      avatar_url: "",
      bio: p.makerBio || "",
      creative_thesis: "",
      links: {},
    },
  };
}

export default function Demo() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <span className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>{" "}
            <span className="text-sm font-normal text-muted-foreground">demo</span>
          </span>
          <Link to="/">
            <Button size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back to live site
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 text-center md:py-24">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        <div className="relative mx-auto max-w-3xl space-y-4">
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            {BRAND.name} <span className="text-muted-foreground">Demo Showcase</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            These are fictional meeps created to preview the {BRAND.name} experience.
            The real site features authentic meeps submitted by real makers.
          </p>
          <p className="text-sm text-muted-foreground/60">
            {BRAND.tagline}
          </p>
        </div>
      </section>

      {/* Demo grid */}
      <main className="container mx-auto space-y-6 px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={toApiShape(p)} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>Demo showcase · {BRAND.footerLine}</p>
      </footer>
    </div>
  );
}
