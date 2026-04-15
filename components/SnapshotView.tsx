import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { ScreenshotCarousel } from "@/components/ScreenshotCarousel";
import { TagBadge } from "@/components/TagBadge";
import type { ProjectSnapshot, SnapshotScreenshot } from "@/lib/types/snapshot";

interface SnapshotViewProps {
  snapshot: ProjectSnapshot & { screenshots: SnapshotScreenshot[] };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function SnapshotView({ snapshot }: SnapshotViewProps) {
  const tags: string[] = snapshot.tags ? JSON.parse(snapshot.tags) : [];

  return (
    <div className="space-y-6">
      {/* Status + published date */}
      <div className="flex flex-wrap items-center gap-3">
        {snapshot.project_status && (
          <ProjectStatusBadge status={snapshot.project_status} />
        )}
        {snapshot.published_at && (
          <span className="text-xs text-muted-foreground">
            Published {formatDate(snapshot.published_at)}
          </span>
        )}
      </div>

      {/* Title */}
      {snapshot.title && (
        <h1 className="font-display text-4xl font-bold md:text-5xl">{snapshot.title}</h1>
      )}

      {/* Tagline */}
      {snapshot.tagline && (
        <p className="text-xl text-muted-foreground">{snapshot.tagline}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag} size="md" />
          ))}
        </div>
      )}

      {/* Primary URL */}
      {snapshot.primary_url && (
        <a
          href={snapshot.primary_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Visit project
        </a>
      )}

      {/* Screenshot carousel — compact inline, visually distinct from SnapshotNav */}
      <ScreenshotCarousel screenshots={snapshot.screenshots} />

      {/* Description */}
      {snapshot.description && (
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold">About</h2>
          <p className="leading-relaxed text-muted-foreground">{snapshot.description}</p>
        </div>
      )}

      {/* Update block */}
      {(snapshot.update_title || snapshot.update_body) && (
        <div className="space-y-2 rounded-xl border border-border bg-secondary/50 p-6">
          {snapshot.update_title && (
            <h2 className="font-display text-xl font-bold">{snapshot.update_title}</h2>
          )}
          {snapshot.update_body && (
            <p className="leading-relaxed text-muted-foreground">{snapshot.update_body}</p>
          )}
        </div>
      )}
    </div>
  );
}
