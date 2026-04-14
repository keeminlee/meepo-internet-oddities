import Link from "next/link";

import { AuthButton } from "@/components/AuthButton";
import { HomeBrowser } from "@/components/HomeBrowser";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getFeatured, getNewest, listProjects } from "@/lib/domain/projects";

// Always fetch fresh from SQLite on each request. The homepage is never cached.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  ensureBootstrapped();
  const featured = getFeatured();
  const newest = getNewest(6);
  const all = listProjects();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Review
            </Link>
            <AuthButton />
            <Link href="/submit">
              <Button size="sm">Post your meep</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 py-20 text-center md:py-32">
        <div className="relative mx-auto max-w-3xl space-y-6">
          <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">{BRAND.name}</h1>
          <p className="text-xl text-muted-foreground md:text-2xl">{BRAND.tagline}</p>
          <p className="mx-auto max-w-xl text-muted-foreground">{BRAND.description}</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/submit">
              <Button size="lg">Post your meep</Button>
            </Link>
            <Link href="#discover">
              <Button size="lg" variant="outline">
                Explore the observatory
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-6 text-sm text-muted-foreground">Authorship is the feature.</div>
      </section>

      <main id="discover" className="container mx-auto space-y-16 px-4 pb-20">
        <HomeBrowser featured={featured} newest={newest} all={all} />
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>{BRAND.footerLine}</p>
      </footer>
    </div>
  );
}
