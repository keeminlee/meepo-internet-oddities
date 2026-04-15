"use client";

import { useEffect, useRef } from "react";

interface Props {
  count: number;
  className?: string;
}

const MAX_PARTICLES = 2000;
const BASE_COLOR = "196, 181, 253"; // tailwind violet-300 (c4b5fd)

export function MeepField({ count, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const rendered = Math.min(Math.max(0, count), MAX_PARTICLES);
    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    type Dot = { x: number; y: number; vx: number; vy: number; a: number; r: number };
    const dots: Dot[] = [];

    const seed = () => {
      dots.length = 0;
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) * 0.42;
      for (let i = 0; i < rendered; i++) {
        const theta = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * r;
        dots.push({
          x: cx + Math.cos(theta) * dist,
          y: cy + Math.sin(theta) * dist,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          a: 0.35 + Math.random() * 0.45,
          r: 0.7 + Math.random() * 0.9,
        });
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let running = true;

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Mild center-pull + brownian jitter. Radius kept <=1.25px; no glow.
    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const bound = Math.min(width, height) * 0.48;

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const dx = cx - d.x;
        const dy = cy - d.y;
        const r2 = dx * dx + dy * dy;
        const bound2 = bound * bound;
        // Soft pull toward center only once a dot drifts past the bound.
        const pull = r2 > bound2 ? 0.0008 : 0.00015;
        d.vx += dx * pull + (Math.random() - 0.5) * 0.04;
        d.vy += dy * pull + (Math.random() - 0.5) * 0.04;
        // Light damping to keep velocities bounded.
        d.vx *= 0.985;
        d.vy *= 0.985;
        d.x += d.vx;
        d.y += d.vy;

        ctx.fillStyle = `rgba(${BASE_COLOR}, ${d.a})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className ?? "w-full h-64"}
    />
  );
}
