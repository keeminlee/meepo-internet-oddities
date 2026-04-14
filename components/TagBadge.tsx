"use client";

const TAG_COLORS: Record<string, string> = {
  Meepo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const DEFAULT_TAG = "bg-muted text-muted-foreground border-border";

interface TagBadgeProps {
  tag: string;
  onClick?: () => void;
  active?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
}

export function TagBadge({ tag, onClick, active, size = "sm", disabled }: TagBadgeProps) {
  const colors = TAG_COLORS[tag] || DEFAULT_TAG;
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
