import { useState } from "react";
import { Link } from "react-router-dom";
import { MousePointerClick } from "lucide-react";
import type { ProjectWithCreator } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { BuiltWithBadge } from "./BuiltWithBadge";
import { TagBadge } from "./TagBadge";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export function ProjectCard({ project }: { project: ProjectWithCreator }) {
  const creatorName = project.creator?.display_name || "Unknown";
  const creatorHandle = project.creator?.handle ? `@${project.creator.handle}` : null;
  const [screenshotError, setScreenshotError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  return (
    <Link
      to={`/project/${project.slug}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Screenshot */}
      <div className="relative overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          {project.screenshot_url && !screenshotError ? (
            <img
              src={project.screenshot_url}
              alt={project.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setScreenshotError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-4xl">
              🌐
            </div>
          )}
        </AspectRatio>
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Maker-first identity */}
        <div className="flex items-center gap-2">
          {project.creator?.avatar_url && !avatarError ? (
            <img src={project.creator.avatar_url} alt={creatorName} className="h-7 w-7 rounded-full" onError={() => setAvatarError(true)} />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {creatorName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">By</p>
            <p className="truncate text-sm font-semibold leading-tight">
              {creatorName}{" "}
              {creatorHandle && (
                <span className="text-xs font-normal text-muted-foreground">{creatorHandle}</span>
              )}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={project.status} />
        </div>

        {/* Project identity */}
        <div>
          <h3 className="font-display text-lg font-bold leading-tight transition-colors group-hover:text-primary">
            {project.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.one_line_pitch}</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} size="sm" />
          ))}
        </div>

        {/* Clicks */}
        <div className="flex items-center gap-1 border-t border-border pt-1 text-xs text-muted-foreground">
          <MousePointerClick className="h-3.5 w-3.5" />
          <span className="font-medium">{(project.clicks_sent || 0).toLocaleString()}</span>
          <span>clicks sent</span>
        </div>
      </div>
    </Link>
  );
}
