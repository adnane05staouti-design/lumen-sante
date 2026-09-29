"use client";

import { useEffect } from "react";

/**
 * Cards marked data-tilt lean towards the mouse with a soft light spot.
 * One listener for the whole page; mouse only (the normal cursor is kept).
 */
export function TiltCards() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tilted: HTMLElement | null = null;
    const reset = () => {
      if (!tilted) return;
      tilted.style.setProperty("--rx", "0deg");
      tilted.style.setProperty("--ry", "0deg");
      tilted.classList.remove("is-tilting");
      tilted = null;
    };
    const onMove = (e: PointerEvent) => {
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (card !== tilted) reset();
      if (!card) return;
      tilted = card;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.classList.add("is-tilting");
      card.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
      card.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", reset);
    };
  }, []);
  return null;
}
