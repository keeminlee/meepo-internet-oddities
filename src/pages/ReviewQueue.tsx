import { useAuth } from "@/hooks/use-auth";
import { useReviewQueue, useApproveProject, useRejectProject } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/TagBadge";
import { LogIn, ArrowLeft, Check, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function ReviewQueue() {
  const { isAuthenticated, isMeepoWriter, loading } = useAuth();
  const { data: pending, isLoading } = useReviewQueue();
  const approve = useApproveProject();
  const reject = useRejectProject();

  const handleReject = (slug: string) => {
    const reason = window.prompt("Rejection reason (optional):");
    if (reason === null) return; // cancelled
    reject.mutate({ slug, reason: reason || undefined });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Sign in to access the review queue.</p>
        <Button asChild>
          <a href="/api/auth/github">
            <LogIn className="h-4 w-4" />
            Sign in with GitHub
          </a>
        </Button>
      </div>
    );
  }

  if (!isMeepoWriter) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">You are not authorized to view this page.</p>
        <Link to="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-xl font-bold">Review Queue</h1>
          </div>
          <span className="text-sm text-muted-foreground">
            {pending?.length ?? 0} pending
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <p className="text-muted-foreground">Loading pending meeps...</p>
        ) : !pending?.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No pending meeps to review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((meep: any) => (
              <div
                key={meep.id}
                className="rounded-lg border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{meep.name}</span>
                      <span className="rounded-full bg-yellow-500/15 text-yellow-400 px-2 py-0.5 text-xs font-medium">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{meep.one_line_pitch}</p>
                    {meep.tags?.length > 0 && (
                      <div className="flex gap-1 pt-1 flex-wrap">
                        {meep.tags.map((tag: any) => (
                          <TagBadge key={tag} tag={tag} size="sm" />
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
                      {meep.external_url && (
                        <a
                          href={meep.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-foreground underline"
                        >
                          URL
                        </a>
                      )}
                      {meep.screenshot_url && (
                        <span>Has screenshot</span>
                      )}
                      {meep.creator && (
                        <span>by @{meep.creator.handle || meep.creator.display_name}</span>
                      )}
                      <span>{meep.created_at}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => approve.mutate(meep.slug)}
                      disabled={approve.isPending || reject.isPending}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(meep.slug)}
                      disabled={approve.isPending || reject.isPending}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
