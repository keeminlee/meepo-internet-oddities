"use client";

const TAG_COLORS: Record<string, string> = {
  Weird: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  Useful: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Beautiful: "bg-pink-500/15 text-pink-500 border-pink-500/30",
  Cursed: "bg-red-500/15 text-red-500 border-red-500/30",
  Game: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  Tool: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Experiment: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Story: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  Prototype: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  Playful: "bg-yellow-400/15 text-yellow-500 border-yellow-400/30",
  Personal: "bg-pink-500/15 text-pink-500 border-pink-500/30",
  Meepo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

interface TagBadgeProps {
  tag: string;
  onClick?: () => void;
  active?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
}

export function TagBadge({ tag, onClick, active, size = "sm", disabled }: TagBadgeProps) {
  const colors = TAG_COLORS[tag] || "bg-muted text-muted-foreground border-border";
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`inline-flex items-center rounded-full border font-medium transition-all duration-200 ${sizeClasses} ${colors} ${
        active ? "ring-2 ring-primary/40 scale-105" : ""
      } ${disabled ? "opacity-40 cursor-not-allowed" : onClick ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
    >
      {tag}
    </button>
  );
}
