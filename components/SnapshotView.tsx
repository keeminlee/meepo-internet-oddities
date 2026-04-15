"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { ScreenshotHero } from "@/components/ScreenshotHero";
import { TagBadge } from "@/components/TagBadge";
import { VisitButton } from "@/components/VisitButton";
import type { ProjectSnapshot, ProjectStatus, SnapshotScreenshot } from "@/lib/types/snapshot";

const PROJECT_STATUSES: ProjectStatus[] = ["idea", "in progress", "on ice", "live", "archived"];

const STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: "Idea",
  "in progress": "In Progress",
  "on ice": "On Ice",
  live: "Live",
  archived: "Archived",
};

const COMMON_TAGS = [
  "tool", "game", "art", "music", "writing", "design", "code", "ai",
  "productivity", "fun", "experiment", "open source",
];

interface SnapshotViewProps {
  slug: string;
  snapshot: ProjectSnapshot & { screenshots: SnapshotScreenshot[] };
  isOwner?: boolean;
  isViewingLatest?: boolean;
  /** projects.why_i_made_this — initial value for the maker-note field. */
  whyMade?: string;
  /** projects.repo_url — initial value for the repo URL field. */
  repoUrl?: string;
}

interface EditForm {
  title: string;
  tagline: string;
  primary_url: string;
  repo_url: string;
  why_made: string;
  project_status: ProjectStatus;
  tags: string[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function SnapshotView({
  slug,
  snapshot,
  isOwner = false,
  isViewingLatest = false,
  whyMade = "",
  repoUrl = "",
}: SnapshotViewProps) {
  const router = useRouter();
  const tags: string[] = snapshot.tags ? JSON.parse(snapshot.tags) : [];

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<EditForm>({
    title: snapshot.title ?? "",
    tagline: snapshot.tagline ?? "",
    primary_url: snapshot.primary_url ?? "",
    repo_url: repoUrl,
    why_made: whyMade,
    project_status: snapshot.project_status ?? "in progress",
    tags,
  });

  const canEdit = isOwner && isViewingLatest;

  function startEditing() {
    setForm({
      title: snapshot.title ?? "",
      tagline: snapshot.tagline ?? "",
      primary_url: snapshot.primary_url ?? "",
      repo_url: repoUrl,
      why_made: whyMade,
      project_status: snapshot.project_status ?? "in progress",
      tags: snapshot.tags ? JSON.parse(snapshot.tags) : [],
    });
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.title,
          one_line_pitch: form.tagline,
          why_i_made_this: form.why_made,
          external_url: form.primary_url,
          repo_url: form.repo_url,
          project_status: form.project_status,
          tags: form.tags,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag].slice(0, 5),
    }));
  }

  function handleScreenshotMutated() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* ── Hero screenshot — TOP, above title ── */}
      <ScreenshotHero
        screenshots={snapshot.screenshots}
        editing={editing && canEdit}
        slug={slug}
        onMutated={handleScreenshotMutated}
      />

      {/* ── Header row: status badge + Edit button ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {snapshot.project_status && !editing && (
            <ProjectStatusBadge status={snapshot.project_status} />
          )}
          {snapshot.published_at && (
            <span className="text-xs text-muted-foreground">
              Published {formatDate(snapshot.published_at)}
            </span>
          )}
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        /* ── Edit form ── */
        <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-border bg-card p-5">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Status */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="edit-status">
              Status
            </label>
            <select
              id="edit-status"
              value={form.project_status}
              onChange={(e) => setForm((f) => ({ ...f, project_status: e.target.value as ProjectStatus }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="edit-title">
              Title
            </label>
            <input
              id="edit-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          {/* Tagline */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="edit-tagline">
              Tagline
            </label>
            <input
              id="edit-tagline"
              type="text"
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              maxLength={150}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          {/* Primary URL */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="edit-url">
              Project URL
            </label>
            <input
              id="edit-url"
              type="url"
              value={form.primary_url}
              onChange={(e) => setForm((f) => ({ ...f, primary_url: e.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          {/* Repo URL */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="edit-repo">
              Repo URL (optional)
            </label>
            <input
              id="edit-repo"
              type="url"
              value={form.repo_url}
              onChange={(e) => setForm((f) => ({ ...f, repo_url: e.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          {/* Why I made this — maker
              note block on the project page. */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="edit-why">
              Why I made this <span className="text-muted-foreground font-normal">(maker note, max 1000)</span>
            </label>
            <textarea
              id="edit-why"
              value={form.why_made}
              maxLength={1000}
              onChange={(e) => setForm((f) => ({ ...f, why_made: e.target.value }))}
              rows={4}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground resize-y"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Tags <span className="text-muted-foreground font-normal">(up to 5)</span></p>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map((tag) => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  onClick={() => toggleTag(tag)}
                  active={form.tags.includes(tag)}
                  size="md"
                  disabled={!form.tags.includes(tag) && form.tags.length >= 5}
                />
              ))}
            </div>
            {form.tags.filter((t) => !COMMON_TAGS.includes(t)).map((tag) => (
              <TagBadge
                key={tag}
                tag={tag}
                onClick={() => toggleTag(tag)}
                active
                size="md"
              />
            ))}
          </div>

          {/* TODO: update_title / update_body are snapshot-specific (draft → publish flow).
              Skip in this inline editor; owners create those via the DraftControl "+" flow. */}

          {/* Save / Cancel */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={cancelEditing}
              className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : (
        /* ── View mode ── */
        <div className="space-y-6">
          {/* Title */}
          {snapshot.title && (
            <h1 className="font-display text-4xl font-bold md:text-5xl">{snapshot.title}</h1>
          )}

          {/* Tagline */}
          {snapshot.tagline && (
            <p className="text-xl text-muted-foreground">{snapshot.tagline}</p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagBadge key={tag} tag={tag} size="md" />
              ))}
            </div>
          )}

          {/* Visit button */}
          {snapshot.primary_url && (
            <VisitButton slug={slug} externalUrl={snapshot.primary_url} />
          )}

          {/* Update block */}
          {(snapshot.update_title || snapshot.update_body) && (
            <div className="space-y-2 rounded-xl border border-border bg-secondary/50 p-6">
              {snapshot.update_title && (
                <h2 className="font-display text-xl font-bold">{snapshot.update_title}</h2>
              )}
              {snapshot.update_body && (
                <p className="leading-relaxed text-muted-foreground">{snapshot.update_body}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
