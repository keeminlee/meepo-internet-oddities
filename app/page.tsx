import { ArrowDown, Sparkles } from "lucide-react";
import Link from "next/link";

import { AuthButton } from "@/components/AuthButton";
import { CosmicCounter } from "@/components/CosmicCounter";
import { DailyQuestCard } from "@/components/DailyQuestCard";
import { HomeBrowser } from "@/components/HomeBrowser";
import { MeepoCard } from "@/components/MeepoCard";
import { OnboardingBubbles } from "@/components/OnboardingBubbles";
import { OnboardingInfoButton } from "@/components/OnboardingInfoButton";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getFeatured, getMostLoved, getNewest } from "@/lib/domain/projects";

// Always fetch fresh from SQLite on each request. The homepage is never cached.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  ensureBootstrapped();
  const featured = getFeatured();
  const newest = getNewest(30);
  const mostLoved = getMostLoved(30);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>
          </Link>
          <div className="flex items-center gap-3">
            <CosmicCounter />
            <AuthButton />
            <OnboardingInfoButton />
            <Link href="/submit">
              <Button size="sm">
                <Sparkles className="h-4 w-4" />
                Submit a project
              </Button>
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
              <Button size="lg">
                <Sparkles className="h-4 w-4" />
                Submit a project
              </Button>
            </Link>
            <Link href="#discover">
              <Button size="lg" variant="outline">
                <ArrowDown className="h-4 w-4" />
                Explore the observatory
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-6 text-sm text-muted-foreground">Authorship is the feature.</div>
      </section>

      <main id="discover" className="container mx-auto space-y-16 px-4 pb-20">
        {/* Pinned cards — observatory + daily quest side by side */}
        <div className="mx-auto flex max-w-2xl flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <MeepoCard />
          </div>
          <div className="flex-1">
            <DailyQuestCard />
          </div>
        </div>

        <HomeBrowser featured={featured} newest={newest} mostLoved={mostLoved} />
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>{BRAND.footerLine}</p>
      </footer>

      <OnboardingBubbles />
    </div>
  );
}
