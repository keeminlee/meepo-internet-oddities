"use client";

import { Eye, EyeOff, Github, LogOut, Settings } from "lucide-react";
import { GoogleIcon } from "@/components/GoogleIcon";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SettingsDialog } from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";

const VIEW_AS_USER_KEY = "meepo_view_as_user";

interface MeResponse {
  authenticated: boolean;
  user?: { id: string; display_name: string; handle: string | null; avatar_url: string };
  is_meepo_writer?: boolean;
  pending_review_count?: number;
}

export function AuthButton() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewAsUser, setViewAsUser] = useState(false);

  const fetchMe = useCallback(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setMe(j as MeResponse))
      .catch(() => setMe({ authenticated: false }));
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  // Hydrate view-as-user preference from sessionStorage
  useEffect(() => {
    try {
      setViewAsUser(window.sessionStorage.getItem(VIEW_AS_USER_KEY) === "1");
    } catch { /* ignore */ }
  }, []);

  if (!me) return <div className="h-8 w-24 animate-pulse rounded bg-muted" />;

  if (!me.authenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <a href="/api/auth/github" aria-label="Sign in with GitHub">
            <Github className="h-4 w-4" /> GitHub
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href="/api/auth/google" aria-label="Sign in with Google">
            <GoogleIcon className="h-4 w-4" /> Google
          </a>
        </Button>
      </div>
    );
  }

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  const toggleViewAsUser = () => {
    const next = !viewAsUser;
    setViewAsUser(next);
    try {
      window.sessionStorage.setItem(VIEW_AS_USER_KEY, next ? "1" : "0");
    } catch { /* ignore */ }
  };

  const isWriter = me.is_meepo_writer && !viewAsUser;
  const myMeepsHref = me.user?.handle ? `/creator/${me.user.handle}` : "#";

  return (
    <div className="flex items-center gap-2">
      <Link
        href={myMeepsHref}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {me.user?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={me.user.avatar_url}
            alt={me.user.display_name}
            className="h-7 w-7 rounded-full"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {me.user?.display_name?.charAt(0) ?? "?"}
          </div>
        )}
        <span className="hidden text-sm font-medium sm:inline">My Projects</span>
      </Link>
      {me.is_meepo_writer && (
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleViewAsUser}
          title={viewAsUser ? "Viewing as regular user — click to restore writer view" : "Click to view as regular user"}
          className={viewAsUser ? "text-primary" : ""}
        >
          {viewAsUser ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      )}
      {isWriter && (
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Review{me.pending_review_count ? ` (${me.pending_review_count})` : ""}
        </Link>
      )}
      <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)} title="Settings">
        <Settings className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onLogout} title="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        displayName={me.user?.display_name ?? ""}
        onSaved={fetchMe}
      />
    </div>
  );
}
