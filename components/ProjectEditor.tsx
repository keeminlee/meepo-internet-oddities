"use client";

import { Pencil, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectData {
  slug: string;
  owner_user_id: string | null;
  name: string;
  one_line_pitch: string;
  external_url: string;
  repo_url: string;
  why_i_made_this: string;
  tags: string[];
}

interface MeResponse {
  authenticated: boolean;
  user?: { id: string };
  is_meepo_writer?: boolean;
}

export function ProjectEditor({
  project,
  onSaved,
}: {
  project: ProjectData;
  onSaved?: () => void;
}) {
  const [isOwner, setIsOwner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: project.name,
    one_line_pitch: project.one_line_pitch,
    external_url: project.external_url,
    repo_url: project.repo_url,
    why_i_made_this: project.why_i_made_this,
    tags: project.tags.join(", "),
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me: MeResponse) => {
        if (me.authenticated && me.user && project.owner_user_id === me.user.id) {
          setIsOwner(true);
        }
      })
      .catch(() => undefined);
  }, [project.owner_user_id]);

  const startEditing = useCallback(() => {
    setForm({
      name: project.name,
      one_line_pitch: project.one_line_pitch,
      external_url: project.external_url,
      repo_url: project.repo_url,
      why_i_made_this: project.why_i_made_this,
      tags: project.tags.join(", "),
    });
    setEditing(true);
    setError("");
  }, [project]);

  const cancel = () => {
    setEditing(false);
    setError("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          one_line_pitch: form.one_line_pitch,
          external_url: form.external_url,
          repo_url: form.repo_url,
          why_i_made_this: form.why_i_made_this,
          tags,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as Record<string, string>).error ?? `HTTP ${res.status}`);
      }
      setEditing(false);
      if (onSaved) {
        onSaved();
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner) return null;

  if (!editing) {
    return (
      <Button size="sm" variant="outline" onClick={startEditing}>
        <Pencil className="h-4 w-4" /> Edit project
      </Button>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Edit project</h3>
        <Button type="button" size="sm" variant="ghost" onClick={cancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="edit-name">Name</Label>
        <Input
          id="edit-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="edit-pitch">One-line pitch</Label>
        <Input
          id="edit-pitch"
          value={form.one_line_pitch}
          onChange={(e) => setForm((f) => ({ ...f, one_line_pitch: e.target.value }))}
          required
          maxLength={150}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="edit-url">External URL</Label>
        <Input
          id="edit-url"
          type="url"
          value={form.external_url}
          onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="edit-repo">Repo URL</Label>
        <Input
          id="edit-repo"
          type="url"
          value={form.repo_url}
          onChange={(e) => setForm((f) => ({ ...f, repo_url: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="edit-why">Why I made this</Label>
        <Input
          id="edit-why"
          value={form.why_i_made_this}
          onChange={(e) => setForm((f) => ({ ...f, why_i_made_this: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
        <Input
          id="edit-tags"
          value={form.tags}
          onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          placeholder="tool, game, art"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
