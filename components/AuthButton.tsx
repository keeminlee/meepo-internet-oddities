"use client";

import { Github, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface MeResponse {
  authenticated: boolean;
  user?: { id: string; display_name: string; handle: string | null; avatar_url: string };
  is_meepo_writer?: boolean;
}

export function AuthButton() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setMe(j as MeResponse))
      .catch(() => setMe({ authenticated: false }));
  }, []);

  if (!me) return <div className="h-8 w-24 animate-pulse rounded bg-muted" />;

  if (!me.authenticated) {
    return (
      <Button asChild size="sm" variant="outline">
        <a href="/api/auth/github">
          <Github className="h-4 w-4" /> Sign in
        </a>
      </Button>
    );
  }

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {me.user?.handle ? `@${me.user.handle}` : me.user?.display_name}
      </span>
      <Button size="sm" variant="ghost" onClick={onLogout} title="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
