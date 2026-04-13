import { BRAND } from "@/lib/constants";
import { ProjectCard } from "@/components/ProjectCard";
import { projects } from "@/data/projects";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
            <ProjectCard key={p.id} project={p} />
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
