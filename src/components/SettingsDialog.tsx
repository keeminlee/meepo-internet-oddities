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
import { useUpdateProfile } from "@/hooks/use-api";
import { toast } from "sonner";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const updateProfile = useUpdateProfile();

  // Sync local state when dialog opens with fresh user data
  const handleOpenChange = (next: boolean) => {
    if (next && user) {
      setDisplayName(user.display_name);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed || trimmed.length > 50) return;

    try {
      await updateProfile.mutateAsync({ display_name: trimmed });
      toast.success("Display name updated!");
      await refreshUser();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Settings</DialogTitle>
          <DialogDescription>
            Update your profile settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <p className="text-xs text-muted-foreground">
              1–50 characters.
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={updateProfile.isPending || !displayName.trim()}
          >
            {updateProfile.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
