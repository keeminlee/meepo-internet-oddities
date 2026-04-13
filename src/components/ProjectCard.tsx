import { Link } from "react-router-dom";
import { MousePointerClick } from "lucide-react";
import { Project } from "@/data/projects";
import { StatusBadge } from "./StatusBadge";
import { BuiltWithBadge } from "./BuiltWithBadge";
import { TagBadge } from "./TagBadge";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/project/${project.slug}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Screenshot */}
      <div className="relative overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          <img
            src={project.screenshot}
            alt={project.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </AspectRatio>
        {project.isDemo && (
          <span className="absolute top-2 right-2 rounded bg-muted/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            Demo
          </span>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Maker-first identity */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {project.makerName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">By</p>
            <p className="truncate text-sm font-semibold leading-tight">
              {project.makerName}{" "}
              {project.makerHandle && (
                <span className="text-xs font-normal text-muted-foreground">{project.makerHandle}</span>
              )}
            </p>
          </div>
        </div>

        {/* Status + Built with */}
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={project.status} />
          <BuiltWithBadge builtWith={project.builtWith} />
        </div>

        {/* Project identity */}
        <div>
          <h3 className="font-display text-lg font-bold leading-tight transition-colors group-hover:text-primary">
            {project.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.pitch}</p>
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
          <span className="font-medium">{project.clicksSent.toLocaleString()}</span>
          <span>clicks sent</span>
        </div>
      </div>
    </Link>
  );
}
