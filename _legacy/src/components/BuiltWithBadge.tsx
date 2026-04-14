import { BuiltWith } from "@/lib/constants";

const BUILT_ICONS: Record<string, string> = {
  Lovable: "💜",
  Replit: "⚡",
  Cursor: "▶️",
  Claude: "🧠",
  ChatGPT: "🤖",
  Bolt: "⚡",
  OpenBuilder: "🔨",
  Other: "✨",
};

export function BuiltWithBadge({ builtWith }: { builtWith: BuiltWith }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      <span>{BUILT_ICONS[builtWith] || "✨"}</span>
      {builtWith}
    </span>
  );
}
