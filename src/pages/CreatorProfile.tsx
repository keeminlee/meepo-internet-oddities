import { useParams, Link } from "react-router-dom";
import { getCreatorByHandle } from "@/data/creators";
import { getAllProjects } from "@/data/projects";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Github, Mail } from "lucide-react";
import { BRAND } from "@/lib/constants";

export default function CreatorProfile() {
  const { handle } = useParams<{ handle: string }>();
  const creator = handle ? getCreatorByHandle(handle) : undefined;

  if (!creator) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="font-display text-3xl font-bold">Creator not found</h1>
          <Link to="/" className="text-primary hover:underline">← Back to {BRAND.name}</Link>
        </div>
      </div>
    );
  }

  const projects = getAllProjects().filter((p) => p.creator_id === creator.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        {/* Creator header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {creator.display_name.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl">{creator.display_name}</h1>
              <p className="text-muted-foreground">@{creator.handle}</p>
            </div>
          </div>

          {creator.bio && (
            <p className="text-muted-foreground">{creator.bio}</p>
          )}

          {creator.creative_thesis && (
            <div className="rounded-xl bg-secondary/50 p-6 border border-border">
              <p className="text-muted-foreground italic leading-relaxed">"{creator.creative_thesis}"</p>
            </div>
          )}

          {/* Links */}
          {(creator.links.website || creator.links.github || creator.links.email) && (
            <div className="flex flex-wrap gap-2">
              {creator.links.website && (
                <Button variant="outline" size="sm" asChild>
                  <a href={creator.links.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                </Button>
              )}
              {creator.links.github && (
                <Button variant="outline" size="sm" asChild>
                  <a href={creator.links.github} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4" /> GitHub
                  </a>
                </Button>
              )}
              {creator.links.email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${creator.links.email}`}>
                    <Mail className="h-4 w-4" /> Contact
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="space-y-4 border-t border-border pt-8">
          <h2 className="font-display text-xl font-bold">
            Projects by {creator.display_name} ({projects.length})
          </h2>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No projects yet.</p>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>{BRAND.footerLine}</p>
      </footer>
    </div>
  );
}
