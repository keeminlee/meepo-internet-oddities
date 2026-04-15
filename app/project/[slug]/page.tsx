import { ArrowLeft, Github, MousePointerClick, AlertTriangle } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DraftControl } from "@/components/DraftControl";
import { ProjectEditor } from "@/components/ProjectEditor";
import { SnapshotPageClient } from "@/components/SnapshotPageClient";
import { StatusBadge } from "@/components/StatusBadge";
import { VisitButton } from "@/components/VisitButton";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { BRAND } from "@/lib/constants";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getProjectBySlug, getProjectBySlugIncludingUnapproved } from "@/lib/domain/projects";
import { getUserFromSession } from "@/lib/domain/sessions";
import {
  ensureFirstSnapshot,
  getSnapshot,
  getSnapshots,
  getLatestPublished,
} from "@/lib/domain/snapshots";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  ensureBootstrapped();
  const { slug } = await params;
  const { v } = await searchParams;

  // Auth: read session once for both owner checks.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  const viewer = token ? getUserFromSession(token) : null;

  // Try approved first, then fall back to unapproved for the owner
  let project = getProjectBySlug(slug);
  let isOwnerViewingRejected = false;

  if (!project) {
    if (viewer) {
      const full = getProjectBySlugIncludingUnapproved(slug);
      if (full && full.owner_user_id === viewer.id) {
        project = full;
        isOwnerViewingRejected = full.rejected;
      }
    }
  }

  if (!project) notFound();

  const creatorName = project.creator?.display_name ?? "Unknown";
  const creatorHandle = project.creator?.handle ? `@${project.creator.handle}` : null;

  // Snapshot setup: ensure at least v1 exists (migration-on-read)
  ensureFirstSnapshot(project.id);

  const publishedSnapshots = getSnapshots(project.id);

  // Determine which version to show
  let snapshot: (typeof publishedSnapshots[0] & { screenshots: import("@/lib/types/snapshot").SnapshotScreenshot[] }) | null = null;

  if (publishedSnapshots.length > 0) {
    const requestedVersion = v ? parseInt(v, 10) : null;

    if (requestedVersion && !isNaN(requestedVersion)) {
      snapshot = getSnapshot(project.id, requestedVersion);
    }

    // Fall back to latest published
    if (!snapshot) {
      const latest = getLatestPublished(project.id);
      if (latest) {
        snapshot = getSnapshot(project.id, latest.version_number);
      }
    }
  }

  const totalVersions = publishedSnapshots.length;

  // Owner + latest-snapshot detection for DraftControl.
  const isOwner = !!viewer && viewer.id === project.owner_user_id;
  const latestPublished = publishedSnapshots.length > 0 ? publishedSnapshots[0] : null;
  const isViewingLatest =
    isOwner &&
    !!snapshot &&
    !!latestPublished &&
    snapshot.version_number === latestPublished.version_number;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        {isOwnerViewingRejected && (
          <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-display font-bold text-lg">Needs changes</h3>
            </div>
            {project.rejection_reason ? (
              <p className="text-sm text-muted-foreground">
                <strong>Reviewer feedback:</strong> {project.rejection_reason}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                This project was sent back for changes. Edit your project below and save to resubmit for review.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Saving your edits will automatically resubmit this project to the review queue.
            </p>
          </div>
        )}

        {!project.approved && !project.rejected && (
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              ⏳ This project is pending review. It will appear publicly once approved.
            </p>
          </div>
        )}

        {/* Approval / review badges (non-snapshot) */}
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={project.status} />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MousePointerClick className="h-4 w-4" />
            <span className="font-semibold">{(project.clicks_sent || 0).toLocaleString()}</span> clicks sent
          </div>
        </div>

        {/* Creator info block (non-snapshot) */}
        <div className="flex items-center gap-3">
          {project.creator?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.creator.avatar_url}
              alt={creatorName}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {creatorName.charAt(0)}
            </div>
          )}
          <div>
            <div className="font-medium">
              {creatorName}
              {creatorHandle && (
                <span className="ml-1 text-sm text-muted-foreground">{creatorHandle}</span>
              )}
            </div>
          </div>
        </div>

        {/* Snapshot content — or fallback to legacy links if no snapshots */}
        {isViewingLatest && <DraftControl slug={slug} />}
        {snapshot ? (
          <SnapshotPageClient
            slug={slug}
            snapshot={snapshot}
            totalVersions={totalVersions}
          />
        ) : (
          /* Fallback: no snapshots (edge case after ensureFirstSnapshot) */
          <div className="space-y-4">
            <h1 className="font-display text-4xl font-bold md:text-5xl">{project.name}</h1>
            <p className="text-xl text-muted-foreground">{project.one_line_pitch}</p>
            <div className="flex flex-wrap items-center gap-3">
              {project.external_url && (
                <VisitButton slug={project.slug} externalUrl={project.external_url} />
              )}
              {project.repo_url && (
                <a
                  href={project.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
                >
                  <Github className="h-4 w-4" />
                  View source
                </a>
              )}
            </div>
          </div>
        )}

        {/* Editor (non-snapshot, owner-only via ProjectEditor's own auth check) */}
        <div className="border-t border-border pt-8">
          <ProjectEditor
            project={{
              slug: project.slug,
              owner_user_id: project.owner_user_id,
              name: project.name,
              one_line_pitch: project.one_line_pitch,
              external_url: project.external_url,
              repo_url: project.repo_url,
              why_i_made_this: project.why_i_made_this,
              tags: project.tags,
            }}
          />
        </div>

        {/* Legacy maker note (non-snapshot) */}
        {project.why_i_made_this && (
          <div className="space-y-2 rounded-xl bg-secondary/50 p-6 border border-border">
            <h2 className="font-display text-xl font-bold">Why I made this (maker note)</h2>
            <p className="text-muted-foreground leading-relaxed italic">
              &ldquo;{project.why_i_made_this}&rdquo;
            </p>
            <p className="text-sm font-medium">— {creatorName}</p>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>{BRAND.footerLine}</p>
      </footer>
    </div>
  );
}
