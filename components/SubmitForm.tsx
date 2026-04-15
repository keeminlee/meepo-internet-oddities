"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TAG_OPTIONS } from "@/lib/constants";

import { TagBadge } from "./TagBadge";

const MAX_TAGS = 5;

export function SubmitForm() {
  const [name, setName] = useState("");
  const [pitch, setPitch] = useState("");
  const [url, setUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [whyMade, setWhyMade] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  // Up to 3 screenshots. Files and their already-uploaded URLs stay aligned
  // by index; a file with a non-null url in the same slot has been uploaded.
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<(string | null)[]>([]);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<
    null | { slug: string; autoApproved: boolean }
  >(null);
  const [isMeepoWriter, setIsMeepoWriter] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { is_meepo_writer?: boolean } | null) => {
        if (!cancelled && data?.is_meepo_writer) setIsMeepoWriter(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const availableTags = isMeepoWriter
    ? TAG_OPTIONS
    : TAG_OPTIONS.filter((t) => t !== "Meepo");

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
      if (screenshotFiles.length === 0) {
        throw new Error("At least one screenshot is required");
      }
      // Upload any files that haven't been uploaded yet; already-uploaded URLs
      // are reused so a retry after a non-upload failure doesn't double-upload.
      const urls: string[] = [];
      const nextUploaded = [...uploadedUrls];
      for (let i = 0; i < screenshotFiles.length; i++) {
        const cached = uploadedUrls[i];
        if (cached) {
          urls.push(cached);
          continue;
        }
        const fd = new FormData();
        fd.append("screenshot", screenshotFiles[i]);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (!up.ok) {
          const j = await up.json().catch(() => ({}));
          throw new Error(j.error || "Upload failed");
        }
        const { filename } = (await up.json()) as { filename: string };
        const u = `/uploads/${filename}`;
        urls.push(u);
        nextUploaded[i] = u;
      }
      setUploadedUrls(nextUploaded);

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          one_line_pitch: pitch,
          external_url: url,
          repo_url: repoUrl,
          screenshot_url: urls[0],
          screenshot_urls: urls,
          tags,
          why_i_made_this: whyMade,
        }),
      });
      if (res.status === 401) {
        setError("You need to sign in before submitting a project.");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Submission failed");
      }
      const body = (await res.json().catch(() => ({}))) as {
        slug?: string;
        auto_approved?: boolean;
      };
      setSubmitted({
        slug: body.slug ?? "",
        autoApproved: body.auto_approved === true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    const liveHref = submitted.slug ? `/project/${submitted.slug}` : "/";
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-8 text-center">
        <div className="text-4xl">✦</div>
        {submitted.autoApproved ? (
          <>
            <h2 className="font-display text-2xl font-bold">Your project is live</h2>
            <p className="text-muted-foreground">
              It&apos;s on Meepo now and collecting meeps. A writer may still
              drop by for a quick read — we&apos;ll reach out only if
              something needs changing.
            </p>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <Button asChild>
                <a href={liveHref}>View your project</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/">Back to browsing</a>
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl font-bold">Submitted for review</h2>
            <p className="text-muted-foreground">
              Your project has been added to the review queue. A writer will check it out soon.
            </p>
            <Button asChild variant="outline">
              <a href="/">Back to browsing</a>
            </Button>
          </>
        )}
      </div>
    );
  }

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
          placeholder="https://github.com/you/your-project"
          onChange={(e) => setRepoUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">GitHub, GitLab, Codeberg, or any source host.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="screenshot">Screenshots (up to 3 · PNG, JPEG, or WebP, max 5MB each)</Label>
        <Input
          id="screenshot"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            setScreenshotFiles((prev) => [...prev, ...picked].slice(0, 3));
            // Reset the input so the same file can be re-picked if removed.
            e.target.value = "";
          }}
          required={screenshotFiles.length === 0}
          disabled={screenshotFiles.length >= 3}
        />
        {screenshotFiles.length > 0 && (
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {screenshotFiles.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2">
                <span className="truncate">
                  {i + 1}. {f.name}
                  {uploadedUrls[i] ? " (uploaded)" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setScreenshotFiles((prev) => prev.filter((_, idx) => idx !== i));
                    setUploadedUrls((prev) => prev.filter((_, idx) => idx !== i));
                  }}
                  className="rounded px-1.5 text-destructive hover:bg-destructive/10"
                  aria-label={`Remove ${f.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {screenshotFiles.length >= 3 && (
          <p className="text-xs text-muted-foreground">Max 3 screenshots.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Tags (up to {MAX_TAGS})</Label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((t) => (
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
