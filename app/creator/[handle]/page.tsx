import { ArrowLeft, Sparkles, MousePointerClick, FolderOpen, Target, AlertTriangle, Clock } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCard } from "@/components/ProjectCard";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { BRAND } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getCreatorByHandle } from "@/lib/domain/creators";
import { dailyRemaining, DAILY_CLICK_CAP } from "@/lib/domain/meeps";
import { getUserFromSession } from "@/lib/domain/sessions";
import { mapProject, type ProjectRow } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ handle: string }>;
}

interface CreatorStats {
  total_meeps: number;
  total_clicks: number;
  project_count: number;
}

export default async function CreatorProfilePage({ params }: Props) {
  ensureBootstrapped();
  const { handle } = await params;
  const creator = getCreatorByHandle(handle);
  if (!creator) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  const viewer = token ? getUserFromSession(token) : null;
  const isSelf = !!(viewer && viewer.handle === handle);

  const rows = getDb()
    .prepare<[string], ProjectRow>("SELECT * FROM projects WHERE creator_id = ? AND approved = 1")
    .all(creator.id);
  const projects = rows.map(mapProject).map((p) => ({ ...p, creator }));

  // Owner-only: show rejected and pending projects so they can act on them
  const rejectedProjects = isSelf
    ? getDb()
        .prepare<[string], ProjectRow>("SELECT * FROM projects WHERE creator_id = ? AND rejected = 1")
        .all(creator.id)
        .map(mapProject)
        .map((p) => ({ ...p, creator }))
    : [];
  const pendingProjects = isSelf
    ? getDb()
        .prepare<[string], ProjectRow>("SELECT * FROM projects WHERE creator_id = ? AND approved = 0 AND rejected = 0")
        .all(creator.id)
        .map(mapProject)
        .map((p) => ({ ...p, creator }))
    : [];

  const statsRow = getDb()
    .prepare<[string], { total_meeps: number; total_clicks: number; project_count: number }>(
      `SELECT COALESCE(SUM(meep_count), 0) AS total_meeps,
              COALESCE(SUM(clicks_sent), 0) AS total_clicks,
              COUNT(*) AS project_count
       FROM projects WHERE creator_id = ? AND approved = 1`,
    )
    .get(creator.id);
  const stats: CreatorStats = statsRow ?? { total_meeps: 0, total_clicks: 0, project_count: 0 };

  const questUsed = isSelf && viewer ? DAILY_CLICK_CAP - dailyRemaining(viewer.id) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="flex items-center gap-4">
          {creator.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.avatar_url}
              alt={creator.display_name}
              className="h-16 w-16 rounded-full"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {creator.display_name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl font-bold">{creator.display_name}</h1>
            <p className="text-muted-foreground">@{creator.handle}</p>
          </div>
        </div>

        {creator.bio && <p className="text-muted-foreground">{creator.bio}</p>}
        {creator.creative_thesis && (
          <blockquote className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground">
            {creator.creative_thesis}
          </blockquote>
        )}

        {Object.keys(creator.links).length > 0 && (
          <div className="flex flex-wrap gap-3 text-sm">
            {Object.entries(creator.links).map(([k, v]) => (
              <a
                key={k}
                href={v}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {k}
              </a>
            ))}
          </div>
        )}

        <section className="space-y-6 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[120px] rounded-lg border border-border bg-card p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.total_meeps.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">meeps earned</p>
            </div>
            {isSelf && (
              <div className="flex-1 min-w-[120px] rounded-lg border border-border bg-card p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-emerald-500 mb-1">
                  <Target className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold tabular-nums">{questUsed}/{DAILY_CLICK_CAP}</p>
                <p className="text-xs text-muted-foreground">daily quest</p>
              </div>
            )}
            <div className="flex-1 min-w-[120px] rounded-lg border border-border bg-card p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <MousePointerClick className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.total_clicks.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">clicks received</p>
            </div>
            <div className="flex-1 min-w-[120px] rounded-lg border border-border bg-card p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <FolderOpen className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.project_count}</p>
              <p className="text-xs text-muted-foreground">projects</p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold">Projects ({projects.length})</h2>

          {rejectedProjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-display text-lg font-bold">Needs changes ({rejectedProjects.length})</h3>
              </div>
              {rejectedProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/project/${p.slug}`}
                  className="block rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4 space-y-1 hover:border-amber-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                      Needs changes
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.one_line_pitch}</p>
                  {p.rejection_reason && (
                    <p className="text-sm text-amber-600/80 dark:text-amber-400/80 italic">
                      Feedback: {p.rejection_reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Click to edit &amp; resubmit →</p>
                </Link>
              ))}
            </div>
          )}

          {pendingProjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <h3 className="font-display text-lg font-bold">Pending review ({pendingProjects.length})</h3>
              </div>
              {pendingProjects.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border bg-muted/30 p-4 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      Pending
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.one_line_pitch}</p>
                </div>
              ))}
            </div>
          )}

          {projects.length === 0 ? (
            <p className="text-muted-foreground">No approved projects yet.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>{BRAND.footerLine}</p>
      </footer>
    </div>
  );
}
