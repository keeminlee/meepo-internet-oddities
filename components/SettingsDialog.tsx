"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  /** Current handle. Null means the user hasn't set one yet — the dialog
   *  surfaces this prominently because their profile/projects URL depends
   *  on it. */
  handle: string | null;
  onSaved: () => void;
}

const HANDLE_REGEX = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;

export function SettingsDialog({
  open,
  onOpenChange,
  displayName: initialName,
  handle: initialHandle,
  onSaved,
}: SettingsDialogProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [handle, setHandle] = useState(initialHandle ?? "");
  const [saving, setSaving] = useState(false);

  // Re-seed local state whenever the dialog opens with fresh server values.
  useEffect(() => {
    if (open) {
      setDisplayName(initialName);
      setHandle(initialHandle ?? "");
    }
  }, [open, initialName, initialHandle]);

  const needsHandle = !initialHandle;
  const handleChanged = handle.trim() !== (initialHandle ?? "");
  const nameChanged = displayName.trim() !== initialName;
  const handleValid = handle.trim() === "" || HANDLE_REGEX.test(handle.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = displayName.trim();
    const trimmedHandle = handle.trim();
    if (!trimmedName || trimmedName.length > 50) return;
    if (trimmedHandle && !HANDLE_REGEX.test(trimmedHandle)) {
      toast.error("Handle: 3–20 chars, lowercase letters, numbers, hyphens.");
      return;
    }

    setSaving(true);
    try {
      // Save handle first (more likely to fail — taken, format) so we don't
      // half-update on conflict.
      if (handleChanged && trimmedHandle) {
        const res = await fetch("/api/auth/handle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: trimmedHandle }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to update handle");
        }
        toast.success("Handle set!");
      }

      if (nameChanged) {
        const res = await fetch("/api/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: trimmedName }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to update profile");
        }
        toast.success("Display name updated!");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {needsHandle ? "Finish setting up your profile" : "Settings"}
          </DialogTitle>
          <DialogDescription>
            {needsHandle
              ? "Pick a handle so your projects have a public URL."
              : "Update your profile settings."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="handle">Handle</Label>
            <Input
              id="handle"
              placeholder="your-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              minLength={3}
              maxLength={20}
              autoComplete="off"
              disabled={!!initialHandle}
              title={initialHandle ? "Handle is permanent and cannot be changed once set" : undefined}
            />
            <p className="text-xs text-muted-foreground">
              {initialHandle
                ? "Handle is permanent — choose carefully when you set it. "
                : "3–20 chars, lowercase letters, numbers, and hyphens. "}
              {handle.trim() && (
                <span className="font-mono">
                  /creator/{handle.trim() || "your-handle"}
                </span>
              )}
            </p>
            {!handleValid && (
              <p className="text-xs text-destructive">Invalid handle format.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              minLength={1}
              maxLength={50}
              required
            />
            <p className="text-xs text-muted-foreground">1–50 characters.</p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={saving || !displayName.trim() || !handleValid || (!handleChanged && !nameChanged)}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
