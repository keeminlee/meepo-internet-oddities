"use client";

import { useState } from "react";
import type { SnapshotScreenshot } from "@/lib/types/snapshot";

interface ScreenshotCarouselProps {
  screenshots: SnapshotScreenshot[];
}

/**
 * Compact inline carousel for up to 3 screenshots.
 * - Zero screenshots: renders nothing.
 * - One screenshot: shows image only (no arrows).
 * - Two or three: small chevron arrows beside the image + dot indicators.
 *
 * Visually distinct from SnapshotNav (which is large / full-height).
 * This carousel is compact: ~320px wide, small arrow buttons, dot strip below.
 */
export function ScreenshotCarousel({ screenshots }: ScreenshotCarouselProps) {
  const [index, setIndex] = useState(0);

  if (screenshots.length === 0) return null;

  const sorted = [...screenshots].sort((a, b) => a.position - b.position);
  const current = sorted[index];
  const hasMultiple = sorted.length > 1;

  function prev() {
    setIndex((i) => (i - 1 + sorted.length) % sorted.length);
  }
  function next() {
    setIndex((i) => (i + 1) % sorted.length);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Image row */}
      <div className="flex items-center gap-1.5">
        {/* Left arrow */}
        {hasMultiple && (
          <button
            onClick={prev}
            aria-label="Previous screenshot"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft />
          </button>
        )}

        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.id}
          src={current.url}
          alt={current.alt_text || "Screenshot"}
          className="h-48 w-auto max-w-sm rounded-lg border border-border object-cover"
        />

        {/* Right arrow */}
        {hasMultiple && (
          <button
            onClick={next}
            aria-label="Next screenshot"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {hasMultiple && (
        <div className="flex gap-1.5 pl-[34px]">
          {sorted.map((ss, i) => (
            <button
              key={ss.id}
              onClick={() => setIndex(i)}
              aria-label={`Go to screenshot ${i + 1}`}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index ? "bg-foreground" : "bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
