import { Github } from "lucide-react";

import { GoogleIcon } from "@/components/GoogleIcon";
import { Button } from "@/components/ui/button";

/**
 * Sign-in gate rendered on /submit when the viewer is anonymous. Explains
 * why submission requires auth and offers the same two providers as the
 * header AuthButton (GitHub + Google). Auth callbacks land on the homepage
 * today — returning to /submit is a future improvement if we add a
 * return_to param.
 */
export function SignInToSubmit() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mb-3 text-4xl">✦</div>
      <h2 className="font-display text-2xl font-bold">Sign in to submit a project</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Meepo is a curated scene, not a dump. We keep a record of who submitted
        what so projects stay connected to their makers. Sign in to continue.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Button asChild size="lg" variant="outline">
          <a href="/api/auth/github" aria-label="Sign in with GitHub">
            <Github className="h-4 w-4" /> Sign in with GitHub
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href="/api/auth/google" aria-label="Sign in with Google">
            <GoogleIcon className="h-4 w-4" /> Sign in with Google
          </a>
        </Button>
      </div>
    </div>
  );
}
