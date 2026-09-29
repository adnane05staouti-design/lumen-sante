"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ShapeName } from "@/components/three/shapes";

/**
 * Phones & tablets: swipe carousel of specialties with a light 3D stage above it.
 * The particle shape follows the card in the centre (tooth, eye, brain…).
 * The stage only appears when the particle canvas is running (html.fx-3d):
 * weak phones and "reduce motion" keep the plain cards, with no empty space.
 */
export function SpecialtiesSwipe({ shapes, labels, header, children }: { shapes: ShapeName[]; labels: string[]; header: ReactNode; children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = Array.from(list.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        // the most visible card wins
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e;
        if (best) setActive(items.indexOf(best.target as HTMLElement));
      },
      { root: list, threshold: [0.55, 0.8] },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  // tell the particle canvas that the shape changed (a horizontal swipe does not scroll the window)
  useEffect(() => {
    window.dispatchEvent(new Event("lumen:shape"));
  }, [active]);

  const go = (i: number) => {
    const list = listRef.current;
    const item = list?.children[i] as HTMLElement | undefined;
    if (list && item) list.scrollTo({ left: item.offsetLeft - (list.clientWidth - item.clientWidth) / 2, behavior: "smooth" });
  };

  return (
    <div className="py-24 lg:hidden" data-shape={shapes[active] ?? "field"} data-shape-dim="1">
      {header}
      <div className="container-x">
        <div aria-hidden="true" data-shape-target className="relative mt-6 hidden h-[min(62vw,300px)] [.fx-3d_&]:block" />
        <div className="mt-4 hidden justify-center gap-2 [.fx-3d_&]:flex" role="tablist" aria-label={labels.join(", ")}>
          {labels.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={label}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-accent" : "w-1.5 bg-line-strong"}`}
            />
          ))}
        </div>
      </div>
      <ul ref={listRef} className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:px-10">
        {children}
      </ul>
    </div>
  );
}
