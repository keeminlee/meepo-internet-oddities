import Link from "next/link";

import { SubmitForm } from "@/components/SubmitForm";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-12 space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">Submit a project</h1>
          <p className="text-muted-foreground">
            Share something strange, useful, or personal. Your submission enters the review queue.
          </p>
        </div>
        <SubmitForm />
      </main>
    </div>
  );
}
