"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TAG_OPTIONS } from "@/lib/constants";

import { TagBadge } from "./TagBadge";

const MAX_TAGS = 5;

export function SubmitForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pitch, setPitch] = useState("");
  const [url, setUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [whyMade, setWhyMade] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const toggleTag = (t: string) => {
    setTags((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, t];
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let screenshotUrl = uploadedFilename ? `/uploads/${uploadedFilename}` : "";
      if (screenshotFile && !uploadedFilename) {
        const fd = new FormData();
        fd.append("screenshot", screenshotFile);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (!up.ok) {
          const j = await up.json().catch(() => ({}));
          throw new Error(j.error || "Upload failed");
        }
        const { filename } = (await up.json()) as { filename: string };
        setUploadedFilename(filename);
        screenshotUrl = `/uploads/${filename}`;
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          one_line_pitch: pitch,
          external_url: url,
          repo_url: repoUrl,
          screenshot_url: screenshotUrl,
          tags,
          why_i_made_this: whyMade,
        }),
      });
      if (res.status === 401) {
        setError("You need to sign in before submitting a meep.");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Submission failed");
      }
      const { slug } = (await res.json()) as { slug: string };
      router.push(`/project/${slug}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pitch">One-line pitch (max 150)</Label>
        <Input
          id="pitch"
          value={pitch}
          maxLength={150}
          onChange={(e) => setPitch(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">{pitch.length}/150</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="url">External URL</Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="repo-url">Repository URL (optional)</Label>
        <Input
          id="repo-url"
          type="url"
          value={repoUrl}
          placeholder="https://github.com/you/your-meep"
          onChange={(e) => setRepoUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">GitHub, GitLab, Codeberg, or any source host.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="screenshot">Screenshot (PNG, JPEG, or WebP, max 5MB)</Label>
        <Input
          id="screenshot"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            setScreenshotFile(e.target.files?.[0] ?? null);
            setUploadedFilename("");
          }}
          required={!uploadedFilename}
        />
        {uploadedFilename && (
          <p className="text-xs text-muted-foreground">Uploaded: {uploadedFilename}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Tags (up to {MAX_TAGS})</Label>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.filter((t) => t !== "Meepo").map((t) => (
            <TagBadge
              key={t}
              tag={t}
              size="md"
              active={tags.includes(t)}
              disabled={!tags.includes(t) && tags.length >= MAX_TAGS}
              onClick={() => toggleTag(t)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="why">Why you made this (max 1000)</Label>
        <Textarea
          id="why"
          value={whyMade}
          maxLength={1000}
          onChange={(e) => setWhyMade(e.target.value)}
          rows={4}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Submitting..." : "Submit for review"}
      </Button>
    </form>
  );
}
