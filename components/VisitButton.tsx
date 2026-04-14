"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

interface VisitButtonProps {
  slug: string;
  externalUrl: string;
}

export function VisitButton({ slug, externalUrl }: VisitButtonProps) {
  const onVisit = () => {
    // Fire-and-forget click tracking; never block navigation.
    void fetch(`/api/projects/${encodeURIComponent(slug)}/click`, { method: "POST" }).catch(
      () => undefined,
    );
    window.open(externalUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Button size="lg" onClick={onVisit}>
      <ExternalLink className="h-4 w-4" /> Visit meep
    </Button>
  );
}
