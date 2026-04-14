import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCard } from "@/components/ProjectCard";
import { BRAND } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getCreatorByHandle } from "@/lib/domain/creators";
import { mapProject, type ProjectRow } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function CreatorProfilePage({ params }: Props) {
  ensureBootstrapped();
  const { handle } = await params;
  const creator = getCreatorByHandle(handle);
  if (!creator) notFound();

  const rows = getDb()
    .prepare<[string], ProjectRow>("SELECT * FROM projects WHERE creator_id = ? AND approved = 1")
    .all(creator.id);
  const projects = rows.map(mapProject).map((p) => ({ ...p, creator }));

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
          <h2 className="font-display text-2xl font-bold">Meeps ({projects.length})</h2>
          {projects.length === 0 ? (
            <p className="text-muted-foreground">No approved meeps yet.</p>
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
