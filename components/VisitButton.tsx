"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface VisitButtonProps {
  slug: string;
  externalUrl: string;
}

type ClickResponse = {
  clicks_sent?: number;
  external_url?: string;
  meeps_minted?: boolean;
  already_clicked?: boolean;
  daily_remaining?: number;
  auth_required?: boolean;
};

type Feedback =
  | { kind: "idle" }
  | { kind: "minted"; remaining: number }
  | { kind: "already"; remaining: number }
  | { kind: "cap" }
  | { kind: "self" }
  | { kind: "anon" }
  | { kind: "error"; message: string };

export function VisitButton({ slug, externalUrl }: VisitButtonProps) {
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle" });

  const onVisit = async () => {
    // Open the external URL immediately — click tracking must never block navigation.
    const win = window.open(externalUrl, "_blank", "noopener,noreferrer");
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(slug)}/click`, {
        method: "POST",
      });
      if (res.status === 403) {
        setFeedback({ kind: "self" });
        return;
      }
      if (res.status === 429) {
        setFeedback({ kind: "cap" });
        return;
      }
      if (!res.ok) {
        setFeedback({ kind: "error", message: `HTTP ${res.status}` });
        return;
      }
      const body = (await res.json()) as ClickResponse;
      if (body.auth_required) {
        setFeedback({ kind: "anon" });
        return;
      }
      if (body.meeps_minted) {
        setFeedback({ kind: "minted", remaining: body.daily_remaining ?? 0 });
      } else if (body.already_clicked) {
        setFeedback({ kind: "already", remaining: body.daily_remaining ?? 0 });
      }
    } catch {
      // Silent — the visit already opened.
      if (!win) setFeedback({ kind: "error", message: "Request failed" });
    }
  };

  return (
    <div className="space-y-2">
      <Button size="lg" onClick={onVisit}>
        <ExternalLink className="h-4 w-4" /> Visit meep
      </Button>
      <FeedbackPill feedback={feedback} />
    </div>
  );
}

function FeedbackPill({ feedback }: { feedback: Feedback }) {
  if (feedback.kind === "idle") return null;
  switch (feedback.kind) {
    case "minted":
      return (
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-500">
          <Sparkles className="h-4 w-4" />
          +1 meep minted · {feedback.remaining} clicks left today
        </p>
      );
    case "already":
      return (
        <p className="text-sm text-muted-foreground">
          Already counted today · {feedback.remaining} clicks left
        </p>
      );
    case "cap":
      return (
        <p className="text-sm text-amber-500">
          Daily click cap reached. Resets at the top of the UTC day.
        </p>
      );
    case "self":
      return (
        <p className="text-sm text-muted-foreground">
          You can&apos;t earn meeps on your own project.
        </p>
      );
    case "anon":
      return (
        <p className="text-sm text-muted-foreground">
          <a href="/api/auth/github" className="text-primary hover:underline">
            Sign in
          </a>{" "}
          to start minting meeps on every visit.
        </p>
      );
    case "error":
      return <p className="text-sm text-red-500">Click tracking failed ({feedback.message})</p>;
  }
}
