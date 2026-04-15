"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CadenceGate, formatNextEligible } from "@/components/CadenceGate";
import { ScreenshotUploader } from "@/components/ScreenshotUploader";
import type { ProjectSnapshot, ProjectStatus, SnapshotScreenshot } from "@/lib/types/snapshot";

const PROJECT_STATUSES: ProjectStatus[] = ["idea", "in progress", "on ice", "live", "archived"];

interface DraftEditorProps {
  slug: string;
  draft: ProjectSnapshot & { screenshots: SnapshotScreenshot[] };
  /** ISO string of last published snapshot's published_at, or null for first publish. */
  lastPublishedAt: string | null;
}

/**
 * DraftEditor — full editing surface for a draft snapshot.
 * Autosaves via PATCH on blur for each field.
 * Publish is gated by 3-day cadence. Discard deletes the draft.
 */
export function DraftEditor({ slug, draft, lastPublishedAt }: DraftEditorProps) {
  const router = useRouter();

  // Parse stored JSON fields.
  const initialSecondaryLinks: string[] = draft.secondary_links
    ? JSON.parse(draft.secondary_links)
    : [];
  const initialTags: string[] = draft.tags ? JSON.parse(draft.tags) : [];

  const [title, setTitle] = useState(draft.title ?? "");
  const [tagline, setTagline] = useState(draft.tagline ?? "");
  const [description, setDescription] = useState(draft.description ?? "");
  const [primaryUrl, setPrimaryUrl] = useState(draft.primary_url ?? "");
  const [secondaryLinksText, setSecondaryLinksText] = useState(
    initialSecondaryLinks.join("\n"),
  );
  const [tagsText, setTagsText] = useState(initialTags.join(", "));
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(
    (draft.project_status as ProjectStatus) ?? "in progress",
  );
  const [updateTitle, setUpdateTitle] = useState(draft.update_title ?? "");
  const [updateBody, setUpdateBody] = useState(draft.update_body ?? "");

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function patch(fields: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${slug}/snapshots/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Save failed");
      } else {
        setSaveMsg("Saved");
        setTimeout(() => setSaveMsg(null), 1500);
      }
    } finally {
      setSaving(false);
    }
  }

  function parseSecondaryLinks(text: string): string[] {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function parseTags(text: string): string[] {
    return text
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    // Save current state first.
    await patch({
      title,
      tagline,
      description,
      primary_url: primaryUrl,
      secondary_links: parseSecondaryLinks(secondaryLinksText),
      tags: parseTags(tagsText),
      project_status: projectStatus,
      update_title: updateTitle,
      update_body: updateBody,
    });
    try {
      const res = await fetch(`/api/projects/${slug}/snapshots/draft/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Publish failed (${res.status})`);
        return;
      }
      const published = await res.json();
      router.push(`/project/${slug}?v=${published.version_number}`);
    } finally {
      setPublishing(false);
    }
  }

  async function handleDiscard() {
    if (!confirm("Discard this draft? This cannot be undone.")) return;
    setDiscarding(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${slug}/snapshots/draft`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Discard failed");
        return;
      }
      router.push(`/project/${slug}`);
    } finally {
      setDiscarding(false);
    }
  }

  const busy = saving || publishing || discarding;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Edit draft</h2>
          <p className="text-sm text-muted-foreground">
            Changes are saved on blur. Publish when ready.
          </p>
        </div>
        {saveMsg && (
          <span className="text-xs font-medium text-green-600 dark:text-green-400">{saveMsg}</span>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* Core fields */}
      <div className="space-y-4">
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => patch({ title })}
            disabled={busy}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
        </Field>

        <Field label="Tagline">
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            onBlur={() => patch({ tagline })}
            disabled={busy}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => patch({ description })}
            disabled={busy}
            rows={5}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
        </Field>

        <Field label="Primary URL">
          <input
            type="url"
            value={primaryUrl}
            onChange={(e) => setPrimaryUrl(e.target.value)}
            onBlur={() => patch({ primary_url: primaryUrl })}
            disabled={busy}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
        </Field>

        <Field label="Secondary links (one URL per line)">
          <textarea
            value={secondaryLinksText}
            onChange={(e) => setSecondaryLinksText(e.target.value)}
            onBlur={() => patch({ secondary_links: parseSecondaryLinks(secondaryLinksText) })}
            disabled={busy}
            rows={3}
            placeholder="https://github.com/..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
        </Field>

        <Field label="Tags (comma-separated)">
          <input
            type="text"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            onBlur={() => patch({ tags: parseTags(tagsText) })}
            disabled={busy}
            placeholder="ai, productivity, open source"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
        </Field>

        <Field label="Project status">
          <select
            value={projectStatus}
            onChange={(e) => {
              const val = e.target.value as ProjectStatus;
              setProjectStatus(val);
              void patch({ project_status: val });
            }}
            disabled={busy}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Update block */}
      <div className="space-y-4 rounded-xl border border-border bg-secondary/30 p-5">
        <h3 className="font-display font-semibold">Update announcement (optional)</h3>
        <Field label="Update headline">
          <input
            type="text"
            value={updateTitle}
            onChange={(e) => setUpdateTitle(e.target.value)}
            onBlur={() => patch({ update_title: updateTitle })}
            disabled={busy}
            placeholder="What changed?"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
        </Field>
        <Field label="Update body">
          <textarea
            value={updateBody}
            onChange={(e) => setUpdateBody(e.target.value)}
            onBlur={() => patch({ update_body: updateBody })}
            disabled={busy}
            rows={4}
            placeholder="Details about what changed..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
        </Field>
      </div>

      {/* Screenshots */}
      <div className="rounded-xl border border-border p-5">
        <ScreenshotUploader
          projectSlug={slug}
          initialScreenshots={draft.screenshots}
        />
      </div>

      {/* Publish / Discard */}
      <div className="flex items-start justify-between gap-4 border-t border-border pt-6">
        <CadenceGate lastPublishedAt={lastPublishedAt}>
          {(blocked, nextEligibleAt) => (
            <div className="space-y-2">
              <button
                onClick={handlePublish}
                disabled={blocked || publishing || discarding}
                className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish"}
              </button>
              {blocked && nextEligibleAt && (
                <p className="text-xs text-muted-foreground">
                  Next publish eligible:{" "}
                  <span className="font-medium text-foreground">
                    {formatNextEligible(nextEligibleAt)}
                  </span>
                </p>
              )}
            </div>
          )}
        </CadenceGate>

        <button
          onClick={handleDiscard}
          disabled={discarding || publishing}
          className="rounded-md border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          {discarding ? "Discarding…" : "Discard draft"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
