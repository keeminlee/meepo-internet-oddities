"use client";

import { MousePointerClick, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ProjectWithCreator } from "@/lib/domain/types";

import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { StatusBadge } from "./StatusBadge";
import { TagBadge } from "./TagBadge";

interface ProjectCardProps {
  project: ProjectWithCreator;
  /** True when the viewer could currently mint a meep from this project.
   *  Drives a persistent emerald outline matching the daily-quest CTA. See
   *  `isProjectEligibleForMeep` in lib/domain/meeps for the full gate. */
  eligibleForMeep?: boolean;
}

export function ProjectCard({ project, eligibleForMeep = false }: ProjectCardProps) {
  const router = useRouter();
  const [screenshotError, setScreenshotError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const creatorName = project.creator?.display_name ?? "Unknown";
  const creatorHandle = project.creator?.handle ? `@${project.creator.handle}` : null;

  // Persistent emerald outline for eligible cards — visible at rest, not just
  // on hover. Hover bumps the glow a little for affordance.
  const borderClass = eligibleForMeep ? "border-emerald-500/40" : "border-border";
  const hoverGlow = eligibleForMeep
    ? "hover:shadow-lg hover:shadow-emerald-500/25 hover:border-emerald-500/60"
    : "hover:shadow-lg hover:shadow-primary/5";

  return (
    <Link
      href={`/project/${project.slug}`}
      className={`group block overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:-translate-y-1 ${borderClass} ${hoverGlow}`}
    >
      <div className="relative overflow-hidden aspect-video">
        {project.screenshot_url && !screenshotError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.screenshot_url}
            alt={project.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setScreenshotError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-4xl">🌐</div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div
          className={`flex items-center gap-2 ${project.creator?.handle ? "cursor-pointer" : ""}`}
          onClick={(e) => {
            if (project.creator?.handle) {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/creator/${project.creator.handle}`);
            }
          }}
          role={project.creator?.handle ? "link" : undefined}
        >
          {project.creator?.avatar_url && !avatarError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.creator.avatar_url}
              alt={creatorName}
              className="h-7 w-7 rounded-full"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {creatorName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">By</p>
            <p className="truncate text-sm font-semibold leading-tight hover:text-primary transition-colors">
              {creatorName}
              {creatorHandle && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">{creatorHandle}</span>
              )}
            </p>
          </div>
        </div>

        <StatusBadge status={project.status} />

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg font-bold leading-tight transition-colors group-hover:text-primary">
              {project.name}
            </h3>
            <ProjectStatusBadge status={project.project_status} />
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.one_line_pitch}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} size="sm" />
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground tabular-nums">
              {(project.meep_count || 0).toLocaleString()}
            </span>
            <span>meeps</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <MousePointerClick className="h-3.5 w-3.5" />
            <span className="tabular-nums">{(project.clicks_sent || 0).toLocaleString()}</span>
            <span>clicks</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
