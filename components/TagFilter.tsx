"use client";

import { TAG_OPTIONS } from "@/lib/constants";
import { TagBadge } from "./TagBadge";

interface TagFilterProps {
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
}

export function TagFilter({ activeTag, onTagChange }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <button
        onClick={() => onTagChange(null)}
        className={`rounded-full border px-3 py-1 text-sm font-medium transition-all ${
          activeTag === null
            ? "bg-foreground text-background border-foreground"
            : "bg-secondary text-secondary-foreground border-border hover:bg-muted"
        }`}
      >
        All
      </button>
      {TAG_OPTIONS.map((tag) => (
        <TagBadge
          key={tag}
          tag={tag}
          size="md"
          active={activeTag === tag}
          onClick={() => onTagChange(activeTag === tag ? null : tag)}
        />
      ))}
    </div>
  );
}
