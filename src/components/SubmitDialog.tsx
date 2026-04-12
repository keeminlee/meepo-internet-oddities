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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_OPTIONS, BUILT_WITH_OPTIONS, TAG_OPTIONS, ProjectTag } from "@/lib/constants";
import { TagBadge } from "./TagBadge";
import { toast } from "sonner";

interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitDialog({ open, onOpenChange }: SubmitDialogProps) {
  const [selectedTags, setSelectedTags] = useState<ProjectTag[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const toggleTag = (tag: ProjectTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirmed) {
      toast.error("Please confirm you own or are authorized to submit this project.");
      return;
    }
    toast.success("Project submitted! We'll review it soon. 🎉");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Post your project</DialogTitle>
          <DialogDescription>
            Built something weird? Put it here. Takes 2 minutes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" placeholder="My weird little thing" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" type="url" placeholder="https://myproject.com" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pitch">One-line pitch</Label>
            <Input id="pitch" placeholder="It does this one strange thing..." required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="screenshot">Screenshot URL</Label>
            <Input id="screenshot" type="url" placeholder="https://i.imgur.com/..." required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maker">Your name</Label>
              <Input id="maker" placeholder="Your name or handle" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Contact email</Label>
              <Input id="email" type="email" placeholder="you@email.com" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Built with</Label>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Pick one" />
                </SelectTrigger>
                <SelectContent>
                  {BUILT_WITH_OPTIONS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Pick one" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((tag) => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  size="sm"
                  active={selectedTags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whyMade">Why did you make this? (optional)</Label>
            <Textarea
              id="whyMade"
              placeholder="I was bored at 2am and..."
              rows={2}
            />
          </div>

          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(c) => setConfirmed(c === true)}
            />
            <Label htmlFor="confirm" className="text-sm text-muted-foreground leading-snug">
              I confirm I own or am authorized to submit this project.
            </Label>
          </div>

          <Button type="submit" className="w-full" size="lg">
            Submit project ✨
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
