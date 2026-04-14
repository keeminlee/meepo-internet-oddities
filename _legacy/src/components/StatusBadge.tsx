import { ProjectStatus } from "@/lib/constants";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Live: "bg-tag-green/15 text-tag-green border-tag-green/40",
  Prototype: "bg-tag-blue/15 text-tag-blue border-tag-blue/40",
  "Seeking Users": "bg-tag-orange/15 text-tag-orange border-tag-orange/40",
  "Seeking Collaborator": "bg-tag-purple/15 text-tag-purple border-tag-purple/40",
};

const STATUS_DOT: Record<ProjectStatus, string> = {
  Live: "bg-tag-green",
  Prototype: "bg-tag-blue",
  "Seeking Users": "bg-tag-orange",
  "Seeking Collaborator": "bg-tag-purple",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]} animate-pulse`} />
      {status}
    </span>
  );
}
