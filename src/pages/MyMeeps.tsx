import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMyProjects } from "@/hooks/use-api";
import { SubmitDialog } from "@/components/SubmitDialog";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/TagBadge";
import { LogIn, Pencil, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function MyMeeps() {
  const { isAuthenticated, user, loading } = useAuth();
  const { data: myMeeps, isLoading } = useMyProjects();
  const [editMeep, setEditMeep] = useState<any | null>(null);
  const [editOpen, setEditOpen] = useState(false);

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
        <p className="text-muted-foreground">Sign in to see your meeps.</p>
        <Button asChild>
          <a href="/api/auth/github">
            <LogIn className="h-4 w-4" />
            Sign in with GitHub
          </a>
        </Button>
      </div>
    );
  }

  const handleEdit = (meep: any) => {
    setEditMeep(meep);
    setEditOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-xl font-bold">My Meeps</h1>
          </div>
          <span className="text-sm text-muted-foreground">@{user?.handle || "..."}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <p className="text-muted-foreground">Loading your meeps...</p>
        ) : !myMeeps?.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">You haven't submitted any meeps yet.</p>
            <Link to="/">
              <Button>Go submit one</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myMeeps.map((meep: any) => (
              <div
                key={meep.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{meep.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        meep.approved
                          ? "bg-green-500/15 text-green-400"
                          : meep.rejected
                            ? "bg-red-500/15 text-red-400"
                            : "bg-yellow-500/15 text-yellow-400"
                      }`}
                    >
                      {meep.approved ? "Approved" : meep.rejected ? "Rejected" : "Pending"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{meep.one_line_pitch}</p>
                  {meep.rejected && meep.rejection_reason && (
                    <p className="text-sm text-red-400/80 italic">Reason: {meep.rejection_reason}</p>
                  )}
                  {meep.tags?.length > 0 && (
                    <div className="flex gap-1 pt-1">
                      {meep.tags.map((tag: any) => (
                        <TagBadge key={tag} tag={tag} size="sm" />
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(meep)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      <SubmitDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editMeep={editMeep}
      />
    </div>
  );
}
