"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * One IntersectionObserver for the whole page: every element with [data-inview]
 * gets the "is-in" class when it scrolls into view (CSS does the animation).
 * Far cheaper than one animated React component per block.
 * Also makes the marquee bands follow the scroll speed and direction.
 */
export function InView() {
  const pathname = usePathname();
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-inview]:not(.is-in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  // Marquees react to the scroll: they speed up, and run backwards when scrolling up.
  // The loop only runs while the page is scrolling, and animations are looked up once.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let anims: Animation[] | null = null;
    let lastY = window.scrollY;
    let velocity = 0;
    let rate = 1;
    let dir = 1;
    let frame = 0;
    const loop = () => {
      velocity *= 0.9;
      const target = dir * (1 + velocity / 6);
      const nextRate = rate + (target - rate) * 0.1;
      if (Math.abs(nextRate - rate) > 0.005) {
        rate = nextRate;
        anims ??= [...document.querySelectorAll<HTMLElement>(".marquee")].flatMap((el) => el.getAnimations());
        anims.forEach((a) => (a.playbackRate = rate));
      }
      // keep going until the band has settled back to its cruising speed
      frame = Math.abs(target - rate) > 0.01 || velocity > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    const onScroll = () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      velocity = Math.max(velocity, Math.min(80, Math.abs(dy)));
      if (dy !== 0) dir = dy > 0 ? 1 : -1;
      if (!frame) frame = requestAnimationFrame(loop);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return null;
}
