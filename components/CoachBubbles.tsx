"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Bubble, TriggerPosition } from "@/lib/onboarding/triggers";

interface Props {
  ariaTitle: string;
  bubbles: Bubble[];
  position: TriggerPosition;
  anchorId?: string;
  context?: Record<string, string>;
  onDismiss: () => void;
}

const POSITION_CLASSES: Record<TriggerPosition, string> = {
  "top-left": "top-20 left-4",
  "bottom-right": "bottom-6 right-4",
};

// ─── Token interpolation ──────────────────────────────────────────────────────

/**
 * Interpolate `{key}` plain tokens against context map.
 * Returns a string (used before link-token parsing).
 */
function interpolateTokens(text: string, ctx: Record<string, string>): string {
  return text.replace(/\{([^}:]+)\}/g, (_, key) => ctx[key] ?? `{${key}}`);
}

/**
 * Parse a line that may contain `{link:displayText:hrefTemplate}` tokens.
 * Returns an array of React nodes (strings and <Link> elements).
 * Plain `{key}` tokens inside display text and hrefs are also interpolated.
 */
function parseLine(
  line: string,
  ctx: Record<string, string>,
  lineKey: number,
): React.ReactNode[] {
  // Match {link:displayKey:hrefTemplate} where hrefTemplate may contain a
  // balanced single-level `{token}` (e.g. /project/{projectSlug}). The href
  // group alternates between non-brace chars and `{...}` groups so nested
  // template tokens don't prematurely end the match.
  const linkPattern = /\{link:([^:}]+):((?:[^{}]|\{[^{}]*\})+)\}/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(line)) !== null) {
    const before = line.slice(lastIndex, match.index);
    if (before) nodes.push(interpolateTokens(before, ctx));

    // Display key is a bare token name — look it up in ctx directly. If not
    // present, fall back to treating the text as a plain string (with any
    // `{key}` tokens inline interpolated).
    const rawDisplay = match[1];
    const displayText = ctx[rawDisplay] ?? interpolateTokens(rawDisplay, ctx);
    const href = interpolateTokens(match[2], ctx);
    // If any token inside the href failed to resolve (still contains `{...}`),
    // fall back to rendering display text as plain prose — no broken link.
    const unresolved = /\{[^}]+\}/.test(href);
    if (unresolved) {
      nodes.push(displayText);
    } else {
      const isInternal = href.startsWith("/");
      if (isInternal) {
        nodes.push(
          <Link
            key={`link-${lineKey}-${match.index}`}
            href={href}
            className="text-primary underline hover:opacity-80"
          >
            {displayText}
          </Link>,
        );
      } else {
        nodes.push(
          <a
            key={`link-${lineKey}-${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80"
          >
            {displayText}
          </a>,
        );
      }
    }
    lastIndex = match.index + match[0].length;
  }

  const tail = line.slice(lastIndex);
  if (tail) nodes.push(interpolateTokens(tail, ctx));

  return nodes;
}

// ─── Anchor positioning ───────────────────────────────────────────────────────

type AnchorStyle = React.CSSProperties & { _side?: "below" | "left" | "right" };

function computeAnchorStyle(
  el: HTMLElement,
  side: "below" | "left" | "right",
): AnchorStyle {
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;

  if (side === "left") {
    return {
      position: "fixed",
      top: Math.max(8, rect.top + rect.height / 2),
      right: vw - rect.left + 12,
      transform: "translateY(-50%)",
      maxWidth: "calc(100vw - 2rem)",
    };
  }
  if (side === "right") {
    return {
      position: "fixed",
      top: Math.max(8, rect.top + rect.height / 2),
      left: rect.right + 12,
      transform: "translateY(-50%)",
      maxWidth: "calc(100vw - 2rem)",
    };
  }
  // "below" (default)
  return {
    position: "fixed",
    top: Math.max(8, rect.bottom + 12),
    left: rect.left + rect.width / 2,
    transform: "translateX(-50%)",
    maxWidth: "calc(100vw - 2rem)",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CoachBubbles({
  ariaTitle,
  bubbles,
  position,
  anchorId: triggerAnchorId,
  context = {},
  onDismiss,
}: Props) {
  const [index, setIndex] = useState(0);
  const [anchorStyle, setAnchorStyle] = useState<React.CSSProperties | null>(null);

  const bubble = bubbles[index];

  // Per-bubble anchor: bubble.anchorId overrides trigger-level anchorId.
  const effectiveAnchorId = bubble?.anchorId ?? triggerAnchorId;
  const effectiveSide = bubble?.anchorSide ?? "below";

  // Recompute anchor position when anchorId or side changes.
  useEffect(() => {
    if (!effectiveAnchorId) {
      setAnchorStyle(null);
      return;
    }
    const update = () => {
      const el = document.getElementById(effectiveAnchorId);
      if (!el) {
        setAnchorStyle(null);
        return;
      }
      setAnchorStyle(computeAnchorStyle(el, effectiveSide));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [effectiveAnchorId, effectiveSide]);

  // coach-highlight class toggle on anchor element.
  useEffect(() => {
    if (!bubble?.highlightAnchor || !effectiveAnchorId) return;
    const el = document.getElementById(effectiveAnchorId);
    if (!el) return;
    el.classList.add("coach-highlight");
    return () => {
      el.classList.remove("coach-highlight");
    };
  }, [bubble?.highlightAnchor, effectiveAnchorId]);

  // onActivate.switchTab dispatch when bubble becomes active.
  const prevIndexRef = useRef<number>(-1);
  useEffect(() => {
    if (!bubble?.onActivate?.switchTab) return;
    if (prevIndexRef.current === index) return;
    prevIndexRef.current = index;
    window.dispatchEvent(
      new CustomEvent("meepo:coach-activate-tab", {
        detail: { tab: bubble.onActivate.switchTab },
      }),
    );
  }, [index, bubble?.onActivate?.switchTab]);

  // Auto-scroll the anchor element into view when a new anchored bubble
  // activates. Uses block:"center" — native scrollIntoView no-ops when the
  // element is already centered, so this is safe to call unconditionally.
  // We defer one frame so tab-switch re-renders (onActivate) settle first.
  useEffect(() => {
    if (!effectiveAnchorId) return;
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(effectiveAnchorId);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(raf);
  }, [effectiveAnchorId, index]);

  if (!bubble) return null;

  const isLast = index === bubbles.length - 1;

  // Dismissal wrapper: dispatches bubble.onDismiss.switchTab (if set) before
  // invoking the manager's onDismiss. Use for every dismiss path — X, Skip,
  // and primary-CTA kinds that close the coach.
  const handleDismiss = () => {
    if (bubble.onDismiss?.switchTab) {
      window.dispatchEvent(
        new CustomEvent("meepo:coach-activate-tab", {
          detail: { tab: bubble.onDismiss.switchTab },
        }),
      );
    }
    onDismiss();
  };

  const onPrimary = () => {
    const p = bubble.primary;
    if (p.kind === "signin") {
      handleDismiss();
      window.location.href = "/api/auth/github";
      return;
    }
    if (p.kind === "scroll-next") {
      if (p.scrollTarget) {
        const id = p.scrollTarget.replace(/^#/, "");
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setTimeout(() => setIndex((i) => i + 1), 600);
      return;
    }
    if (p.kind === "scroll") {
      handleDismiss();
      if (p.scrollTarget) {
        const id = p.scrollTarget.replace(/^#/, "");
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    // "next"
    if (isLast) handleDismiss();
    else setIndex((i) => i + 1);
  };

  const useAnchor = !!anchorStyle;
  const wrapperClass = useAnchor
    ? "z-40 px-4"
    : `pointer-events-none fixed z-40 flex px-4 ${POSITION_CLASSES[position]}`;

  return (
    <div className={wrapperClass} style={anchorStyle ?? undefined}>
      <div
        role="dialog"
        aria-label={`${ariaTitle} ${index + 1} of ${bubbles.length}: ${bubble.title}`}
        className="pointer-events-auto w-full max-w-sm rounded-2xl border-2 border-primary/40 bg-card/95 p-5 shadow-xl backdrop-blur"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-primary">
              {index + 1} / {bubbles.length}
            </p>
            <h2 className="font-display text-lg font-bold">{bubble.title}</h2>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss tutorial"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {bubble.lines.map((line, i) => (
            <p key={i}>{parseLine(line, context, i)}</p>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          <Button size="sm" onClick={onPrimary}>
            {bubble.primary.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
