import type { ProjectStatus } from "@/lib/constants";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Live: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  Prototype: "bg-sky-500/15 text-sky-500 border-sky-500/40",
  "Seeking Users": "bg-amber-500/15 text-amber-500 border-amber-500/40",
  "Seeking Collaborator": "bg-violet-500/15 text-violet-500 border-violet-500/40",
};

const STATUS_DOT: Record<ProjectStatus, string> = {
  Live: "bg-emerald-500",
  Prototype: "bg-sky-500",
  "Seeking Users": "bg-amber-500",
  "Seeking Collaborator": "bg-violet-500",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status as ProjectStatus] ?? "bg-muted text-muted-foreground border-border";
  const dot = STATUS_DOT[status as ProjectStatus] ?? "bg-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot} animate-pulse`} />
      {status}
    </span>
  );
}
