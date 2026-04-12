import { ProjectTag } from "@/lib/constants";

const TAG_COLORS: Record<string, string> = {
  Weird: "bg-tag-purple/15 text-tag-purple border-tag-purple/30",
  Useful: "bg-tag-green/15 text-tag-green border-tag-green/30",
  Beautiful: "bg-tag-pink/15 text-tag-pink border-tag-pink/30",
  Cursed: "bg-tag-cursed/15 text-tag-cursed border-tag-cursed/30",
  Game: "bg-tag-blue/15 text-tag-blue border-tag-blue/30",
  Tool: "bg-tag-green/15 text-tag-green border-tag-green/30",
  Experiment: "bg-tag-orange/15 text-tag-orange border-tag-orange/30",
  Story: "bg-tag-purple/15 text-tag-purple border-tag-purple/30",
  Prototype: "bg-tag-blue/15 text-tag-blue border-tag-blue/30",
  Playful: "bg-tag-yellow/15 text-tag-yellow border-tag-yellow/30",
  Personal: "bg-tag-pink/15 text-tag-pink border-tag-pink/30",
};

interface TagBadgeProps {
  tag: ProjectTag;
  onClick?: () => void;
  active?: boolean;
  size?: "sm" | "md";
}

export function TagBadge({ tag, onClick, active, size = "sm" }: TagBadgeProps) {
  const colors = TAG_COLORS[tag] || "bg-muted text-muted-foreground border-border";
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border font-medium transition-all duration-200 ${sizeClasses} ${colors} ${
        active ? "ring-2 ring-primary/40 scale-105" : ""
      } ${onClick ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
    >
      {tag}
    </button>
  );
}
