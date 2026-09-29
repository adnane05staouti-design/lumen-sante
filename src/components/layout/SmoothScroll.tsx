"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/** Inertia-based smooth scrolling (disabled when the user prefers reduced motion). */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.13, smoothWheel: true, anchors: true });
    (window as Window & { __lenis?: Lenis }).__lenis = lenis;
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      delete (window as Window & { __lenis?: Lenis }).__lenis;
    };
  }, []);
  return null;
}

/** Smoothly scrolls to a position, through Lenis when it is active. */
export function scrollToY(y: number) {
  const lenis = (window as Window & { __lenis?: Lenis }).__lenis;
  if (lenis) lenis.scrollTo(y, { duration: 1 });
  else window.scrollTo({ top: y, behavior: "smooth" });
}
