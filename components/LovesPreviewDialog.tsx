"use client";

import { Heart, Send, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SEND_OPTIONS = [1, 3, 5] as const;

export function isLovesLabel(label: string): boolean {
  return /love/i.test(label);
}

export function LovesPreviewDialog({ children }: { children: React.ReactNode }) {
  const [amount, setAmount] = useState<number>(3);
  const [sent, setSent] = useState(false);

  const reset = () => {
    setAmount(3);
    setSent(false);
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) reset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <DialogTitle>Coming soon: Loves</DialogTitle>
          </div>
          <DialogDescription>
            When we cross 100 cosmic meeps, you&apos;ll be able to send meeps to
            projects you love. Here&apos;s what it&apos;ll feel like.
          </DialogDescription>
        </DialogHeader>

        {/* Mockup: fake project card */}
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-lg"
            >
              ✦
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold truncate">Strange Radio</p>
              <p className="text-xs text-muted-foreground truncate">
                A shortwave for ideas that never aired
              </p>
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Preview
            </span>
          </div>

          <div className="h-24 rounded-md bg-gradient-to-br from-muted to-background border border-border/60 flex items-center justify-center text-xs text-muted-foreground">
            (screenshot)
          </div>

          {/* Send-love panel */}
          <div className="rounded-lg border border-border bg-background/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Heart className="h-3.5 w-3.5 text-primary" /> Send love
              </span>
              <span className="text-[11px] text-muted-foreground">
                from your meep balance
              </span>
            </div>

            <div className="flex gap-2">
              {SEND_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    if (!sent) setAmount(n);
                  }}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-sm font-medium transition-all ${
                    amount === n
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card hover:bg-muted"
                  } ${sent ? "opacity-60" : ""}`}
                >
                  {n} ✦
                </button>
              ))}
            </div>

            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={sent}
              onClick={() => setSent(true)}
            >
              {sent ? (
                <>
                  <Sparkles className="h-4 w-4" /> Sent {amount} meep
                  {amount === 1 ? "" : "s"} — thanks for the love
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send {amount} meep
                  {amount === 1 ? "" : "s"}
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          Preview only — no meeps will change hands until Loves unlocks.
        </p>
      </DialogContent>
    </Dialog>
  );
}
