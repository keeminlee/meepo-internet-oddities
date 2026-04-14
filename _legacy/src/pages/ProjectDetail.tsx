import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useProject, useTrackClick } from "@/hooks/use-api";
import { StatusBadge } from "@/components/StatusBadge";
import { TagBadge } from "@/components/TagBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, MousePointerClick } from "lucide-react";
import { BRAND } from "@/lib/constants";

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: project, isLoading } = useProject(slug || "");
  const trackClick = useTrackClick();
  const [screenshotError, setScreenshotError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="font-display text-3xl font-bold">Meep not found</h1>
          <Link to="/" className="text-primary hover:underline">← Back to {BRAND.name}</Link>
        </div>
      </div>
    );
  }

  const creatorName = project.creator?.display_name || "Unknown";
  const creatorHandle = project.creator?.handle ? `@${project.creator.handle}` : null;

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

        {/* Hero image */}
        {project.screenshot_url && (
          <div className="overflow-hidden rounded-xl border border-border">
            {!screenshotError ? (
              <img
                src={project.screenshot_url}
                alt={project.name}
                className="w-full object-cover"
                style={{ maxHeight: "480px" }}
                onError={() => setScreenshotError(true)}
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center bg-muted text-4xl">
                🌐
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={project.status} />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MousePointerClick className="h-4 w-4" />
              <span className="font-semibold">{(project.clicks_sent || 0).toLocaleString()}</span> clicks sent
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold md:text-5xl">{project.name}</h1>
          <p className="text-xl text-muted-foreground">{project.one_line_pitch}</p>

          {/* Maker identity */}
          <div className="flex items-center gap-3">
            {project.creator?.avatar_url && !avatarError ? (
              <img src={project.creator.avatar_url} alt={creatorName} className="h-10 w-10 rounded-full" onError={() => setAvatarError(true)} />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {creatorName.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-medium">{creatorName} {creatorHandle && <span className="text-sm text-muted-foreground">{creatorHandle}</span>}</div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} size="md" />
            ))}
          </div>

          {project.external_url && (
            <Button
              size="lg"
              onClick={() => {
                try {
                  if (slug) trackClick.mutate(slug);
                } catch { /* best-effort tracking — never block navigation */ }
                window.open(project.external_url, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="h-4 w-4" /> Visit meep
            </Button>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-8 border-t border-border pt-8">
          {project.about && (
            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold">Artifact note</h2>
              <p className="text-muted-foreground leading-relaxed">{project.about}</p>
            </div>
          )}

          {project.why_i_made_this && (
            <div className="space-y-2 rounded-xl bg-secondary/50 p-6 border border-border">
              <h2 className="font-display text-xl font-bold">Why I made this (maker note)</h2>
              <p className="text-muted-foreground leading-relaxed italic">"{project.why_i_made_this}"</p>
              <p className="text-sm font-medium">— {creatorName}</p>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>{BRAND.footerLine}</p>
      </footer>
    </div>
  );
}
