import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCreator, useMyProjects } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { MyMeepCard } from "@/components/MyMeepCard";
import { SubmitDialog } from "@/components/SubmitDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Github, Mail } from "lucide-react";
import { BRAND } from "@/lib/constants";

export default function CreatorProfile() {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuth();
  const { data: creator, isLoading } = useCreator(handle || "");
  const isOwner = !!user?.handle && user.handle === handle;
  const { data: ownerMeeps } = useMyProjects();
  const [editMeep, setEditMeep] = useState<any | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="font-display text-3xl font-bold">Creator not found</h1>
          <Link to="/" className="text-primary hover:underline">← Back to {BRAND.name}</Link>
        </div>
      </div>
    );
  }

  const meeps = isOwner ? (ownerMeeps || []) : (creator.projects || []);
  const links: any = creator.links || {};
  const handleEdit = (meep: any) => { setEditMeep(meep); setEditOpen(true); };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-xl font-bold tracking-tight">
            {BRAND.name} <span className="text-primary">·</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {creator.avatar_url && !avatarError ? (
              <img
                src={creator.avatar_url}
                alt={creator.display_name}
                className="h-16 w-16 rounded-full"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {creator.display_name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold md:text-4xl">{creator.display_name}</h1>
              <p className="text-muted-foreground">@{creator.handle}</p>
            </div>
            {isOwner && (
              <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                You
              </span>
            )}
          </div>

          {creator.bio && <p className="text-muted-foreground">{creator.bio}</p>}

          {creator.creative_thesis && (
            <div className="rounded-xl bg-secondary/50 p-6 border border-border">
              <p className="text-muted-foreground italic leading-relaxed">"{creator.creative_thesis}"</p>
            </div>
          )}

          {(links.website || links.github || links.email) && (
            <div className="flex flex-wrap gap-2">
              {links.website && (
                <Button variant="outline" size="sm" asChild>
                  <a href={links.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                </Button>
              )}
              {links.github && (
                <Button variant="outline" size="sm" asChild>
                  <a href={links.github} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4" /> GitHub
                  </a>
                </Button>
              )}
              {links.email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${links.email}`}>
                    <Mail className="h-4 w-4" /> Contact
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-border pt-8">
          <h2 className="font-display text-xl font-bold">
            {isOwner ? "Your meeps" : `Meeps by ${creator.display_name}`} ({meeps.length})
          </h2>
          {meeps.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {meeps.map((meep: any) => (
                <MyMeepCard
                  key={meep.id}
                  meep={meep}
                  onEdit={isOwner ? handleEdit : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No meeps yet.</p>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>{BRAND.footerLine}</p>
      </footer>

      {isOwner && (
        <SubmitDialog open={editOpen} onOpenChange={setEditOpen} editMeep={editMeep} />
      )}
    </div>
  );
}
