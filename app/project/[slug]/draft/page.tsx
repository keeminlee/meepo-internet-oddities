import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DraftEditor } from "@/components/DraftEditor";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { BRAND } from "@/lib/constants";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getProjectBySlug } from "@/lib/domain/projects";
import { getUserFromSession } from "@/lib/domain/sessions";
import { getDraft, getLatestPublished } from "@/lib/domain/snapshots";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DraftPage({ params }: Props) {
  ensureBootstrapped();
  const { slug } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  const user = token ? getUserFromSession(token) : null;

  const project = getProjectBySlug(slug);
  if (!project) notFound();

  // Only the owner can view the draft page.
  if (!user || user.id !== project.owner_user_id) {
    redirect(`/project/${slug}`);
  }

  const draft = getDraft(project.id);
  if (!draft) {
    // No draft yet — send back to project page; DraftControl will create one.
    redirect(`/project/${slug}`);
  }

  // Last published snapshot's published_at for cadence gate.
  const latestPublished = getLatestPublished(project.id);
  const lastPublishedAt = latestPublished?.published_at ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>
          </Link>
          <span className="text-xs font-medium text-muted-foreground">Draft mode</span>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        <Link
          href={`/project/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to project
        </Link>

        <DraftEditor
          slug={slug}
          draft={draft}
          lastPublishedAt={lastPublishedAt}
        />
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>{BRAND.footerLine}</p>
      </footer>
    </div>
  );
}
