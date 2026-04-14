import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminQueue } from "@/components/AdminQueue";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { BRAND } from "@/lib/constants";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getUserFromSession } from "@/lib/domain/sessions";
import { listPending } from "@/lib/domain/submissions";
import { isMeepoWriter } from "@/lib/domain/users";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  ensureBootstrapped();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  const user = token ? getUserFromSession(token) : null;
  if (!user) redirect("/api/auth/github");
  if (!isMeepoWriter(user.email)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="font-display text-2xl font-bold">Forbidden</h1>
          <p className="text-muted-foreground">
            You&apos;re signed in as {user.display_name}, but only Meepo writers can review submissions.
          </p>
          <Link href="/" className="text-primary hover:underline">
            ← Back to {BRAND.name}
          </Link>
        </div>
      </main>
    );
  }
  const pending = listPending();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>
          </Link>
          <span className="text-sm text-muted-foreground">Review queue</span>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold">Pending submissions</h1>
          <p className="text-muted-foreground">{pending.length} awaiting review</p>
        </div>
        <AdminQueue initial={pending} />
      </main>
    </div>
  );
}
