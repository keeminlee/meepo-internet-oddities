import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TAG_OPTIONS, ProjectTag } from "@/lib/constants";
import { TagBadge } from "./TagBadge";
import { useAuth } from "@/hooks/use-auth";
import { useSubmitProject, useUpdateProject } from "@/hooks/use-api";
import { toast } from "sonner";
import { LogIn, Upload, X } from "lucide-react";

interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMeep?: any | null;
}

const PITCH_MAX = 150;
const NOTE_MAX = 1000;
const TAG_LIMIT = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function SubmitDialog({ open, onOpenChange, editMeep }: SubmitDialogProps) {
  const { isAuthenticated, isMeepoWriter } = useAuth();
  const submitMutation = useSubmitProject();
  const updateMutation = useUpdateProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = !!editMeep;

  const [name, setName] = useState("");
  const [pitch, setPitch] = useState("");
  const [url, setUrl] = useState("");
  const [whyIMadeThis, setWhyIMadeThis] = useState("");
  const [selectedTags, setSelectedTags] = useState<ProjectTag[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Pre-populate on edit
  useEffect(() => {
    if (editMeep && open) {
      setName(editMeep.name || "");
      setPitch(editMeep.one_line_pitch || "");
      setUrl(editMeep.external_url || "");
      setWhyIMadeThis(editMeep.why_i_made_this || "");
      setSelectedTags(editMeep.tags || []);
      setConfirmed(true);
      setScreenshotFile(null);
      setScreenshotPreview(editMeep.screenshot_url || null);
    }
  }, [editMeep, open]);

  const toggleTag = (tag: ProjectTag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= TAG_LIMIT) return prev;
      return [...prev, tag];
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only PNG, JPEG, and WebP images are accepted.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum 5MB.");
      return;
    }
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setName("");
    setPitch("");
    setUrl("");
    setWhyIMadeThis("");
    setSelectedTags([]);
    setConfirmed(false);
    clearScreenshot();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirmed) {
      toast.error("Please confirm you own or are authorized to submit this meep.");
      return;
    }
    if (pitch.length > PITCH_MAX) {
      toast.error(`Pitch must be ${PITCH_MAX} characters or fewer.`);
      return;
    }
    if (!url.trim()) {
      toast.error("URL is required.");
      return;
    }
    if (!screenshotFile && !screenshotPreview) {
      toast.error("Screenshot is required.");
      return;
    }

    try {
      setUploading(true);
      let screenshotUrl: string | undefined = isEditMode ? editMeep.screenshot_url : undefined;

      // Upload screenshot first if a new file was selected
      if (screenshotFile) {
        const formData = new FormData();
        formData.append("screenshot", screenshotFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Screenshot upload failed");
        }
        const { filename } = await uploadRes.json();
        screenshotUrl = `/uploads/${filename}`;
      }

      if (isEditMode) {
        await updateMutation.mutateAsync({
          slug: editMeep.slug,
          name: name.trim(),
          one_line_pitch: pitch.trim(),
          external_url: url.trim() || undefined,
          screenshot_url: screenshotUrl,
          why_i_made_this: whyIMadeThis.trim() || undefined,
          tags: selectedTags.length > 0 ? selectedTags : [],
        });
        toast.success("Meep updated! ✏️");
      } else {
        await submitMutation.mutateAsync({
          name: name.trim(),
          one_line_pitch: pitch.trim(),
          external_url: url.trim() || undefined,
          screenshot_url: screenshotUrl,
          why_i_made_this: whyIMadeThis.trim() || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        });
        toast.success("Meep submitted! 🎉");
      }
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{isEditMode ? "Edit your meep" : "Post your meep"}</DialogTitle>
          <DialogDescription>
            Built something personal, distinctive, or playful? Publish the artifact and maker story in under 2 minutes.
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-center text-muted-foreground">
              Sign in with GitHub to submit your meep.
            </p>
            <Button asChild>
              <a href="/api/auth/github">
                <LogIn className="h-4 w-4" />
                Sign in with GitHub
              </a>
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Meep name</Label>
            <Input
              id="name"
              placeholder="My latest internet oddity"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pitch">
              One-line pitch{" "}
              <span className={`text-xs ${pitch.length > PITCH_MAX ? "text-destructive" : "text-muted-foreground"}`}>
                ({pitch.length}/{PITCH_MAX})
              </span>
            </Label>
            <Input
              id="pitch"
              placeholder="A distinctive corner of the internet built my way..."
              required
              maxLength={PITCH_MAX}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL <span className="text-xs text-destructive">*</span></Label>
            <Input
              id="url"
              type="url"
              placeholder="https://myproject.com"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Screenshot <span className="text-xs text-destructive">*</span> <span className="text-xs text-muted-foreground">(max 5MB)</span></Label>
            {screenshotPreview ? (
              <div className="relative inline-block">
                <img
                  src={screenshotPreview}
                  alt="Screenshot preview"
                  className="max-h-32 rounded border border-border"
                />
                <button
                  type="button"
                  onClick={clearScreenshot}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="screenshot"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload a screenshot (PNG, JPEG, WebP)
                <input
                  ref={fileInputRef}
                  id="screenshot"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="whyMade">
              Why did you make this?{" "}
              <span className="text-xs text-muted-foreground">(optional, {whyIMadeThis.length}/{NOTE_MAX})</span>
            </Label>
            <Textarea
              id="whyMade"
              placeholder="I wanted to make something that felt unmistakably mine..."
              rows={3}
              maxLength={NOTE_MAX}
              value={whyIMadeThis}
              onChange={(e) => setWhyIMadeThis(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags <span className="text-xs text-muted-foreground">(up to {TAG_LIMIT})</span></Label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((tag) => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  size="sm"
                  active={selectedTags.includes(tag)}
                  disabled={tag === "Meepo" && !isMeepoWriter}
                  onClick={() => toggleTag(tag)}
                />
              ))}
            </div>
            {TAG_OPTIONS.includes("Meepo" as any) && !isMeepoWriter && (
              <p className="text-xs text-muted-foreground">
                The Meepo tag is reserved for official Meepo surfaces.
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(c) => setConfirmed(c === true)}
            />
            <Label htmlFor="confirm" className="text-sm text-muted-foreground leading-snug">
              I confirm I own or am authorized to submit this meep.
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitMutation.isPending || updateMutation.isPending || uploading}
          >
            {uploading ? "Uploading…" : (submitMutation.isPending || updateMutation.isPending) ? (isEditMode ? "Saving…" : "Submitting…") : isEditMode ? "Save changes" : "Submit meep ✨"}
          </Button>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
