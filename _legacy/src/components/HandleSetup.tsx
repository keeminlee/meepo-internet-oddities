import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function HandleSetup() {
  const { needsHandle, refreshUser } = useAuth();
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!needsHandle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ handle }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to set handle");
        return;
      }
      toast.success(`Handle set to @${handle}!`);
      await refreshUser();
    } catch {
      toast.error("Failed to set handle");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Choose your handle</DialogTitle>
          <DialogDescription>
            Your handle is your identity on Meepo. Pick something memorable — you can&apos;t change it later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="handle">@handle</Label>
            <Input
              id="handle"
              placeholder="your-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              minLength={3}
              maxLength={20}
              required
            />
            <p className="text-xs text-muted-foreground">
              3–20 characters. Lowercase letters, numbers, and hyphens.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={submitting || handle.length < 3}>
            {submitting ? "Setting…" : "Set handle"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
