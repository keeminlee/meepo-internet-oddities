import type { ProjectStatus } from "@/lib/types/snapshot";

const BADGE_STYLES: Record<ProjectStatus, string> = {
  idea: "bg-blue-100 text-blue-700",
  "in progress": "bg-amber-100 text-amber-700",
  "on ice": "bg-gray-100 text-gray-600",
  live: "bg-green-100 text-green-700",
  archived: "bg-zinc-100 text-zinc-500",
};

const DISPLAY_LABELS: Record<ProjectStatus, string> = {
  idea: "Idea",
  "in progress": "In Progress",
  "on ice": "On Ice",
  live: "Live",
  archived: "Archived",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const style = BADGE_STYLES[status] ?? "bg-gray-100 text-gray-600";
  const label = DISPLAY_LABELS[status] ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {label}
    </span>
  );
}
