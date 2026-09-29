"use client";

import { useEffect, useRef } from "react";
import type { ParticleEngine } from "./ParticleEngine";
import { isShape } from "./shapes";

/**
 * Fixed full-screen particle canvas behind the page.
 *
 * Sections declare what the particles should become while they cross the middle of the screen:
 *   <section data-shape="tooth" data-shape-dim="0.5"> … <div data-shape-target /> … </section>
 * The shape is drawn inside the [data-shape-target] box (it scrolls with the page),
 * or inside the element named by data-shape-target-ref="#id";
 * without a target it floats in the centre of the screen.
 *
 * Performance strategy:
 *  - three.js is never on the critical path: it is downloaded after the page is idle (desktop)
 *    or after the first touch / scroll (phones), so the first paint stays instant;
 *  - fewer particles and pixel ratio 1 on phones; nothing at all with "reduce motion".
 */
const cssVar = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export function ParticleStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    const desktop = window.matchMedia("(min-width: 1024px)").matches && window.matchMedia("(pointer: fine)").matches;
    if (!desktop && (cores < 4 || memory < 4)) return;
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return;

    let engine: ParticleEngine | null = null;
    let disposed = false;
    let scheduled = false;

    const pickSection = () => {
      scheduled = false;
      if (!engine) return;
      const mid = window.innerHeight / 2;
      let chosen: HTMLElement | null = null;
      for (const el of document.querySelectorAll<HTMLElement>("[data-shape]")) {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.top <= mid && r.bottom >= mid) chosen = el; // deepest / last match wins
      }
      const shape = chosen?.dataset.shape;
      const valid = isShape(shape);
      engine.setTarget(valid ? shape : "field", valid ? Number(chosen?.dataset.shapeDim ?? 1) : 0.45);
      const ref = chosen?.dataset.shapeTargetRef;
      const target = ref ? document.querySelector<HTMLElement>(ref) : chosen?.querySelector<HTMLElement>("[data-shape-target]");
      const box = target?.getBoundingClientRect();
      if (box && box.width > 0) {
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        engine.setPlacement((cx / window.innerWidth) * 2 - 1, -((cy / window.innerHeight) * 2 - 1), Math.min(box.width, box.height) / window.innerHeight);
      } else {
        engine.setPlacement(0, 0, 0.75);
      }
    };

    let lastY = window.scrollY;
    const onScroll = () => {
      engine?.addScrollVelocity(window.scrollY - lastY);
      lastY = window.scrollY;
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(pickSection);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      engine?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("a, button, input, textarea, select, label, [role=button]")) return;
      engine?.burst((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    const onResize = () => {
      engine?.resize(window.innerWidth, window.innerHeight);
      onScroll();
    };

    const boot = async () => {
      if (engine || disposed) return;
      const { ParticleEngine } = await import("./ParticleEngine");
      if (disposed) return;
      engine = new ParticleEngine(canvas, {
        count: desktop ? 14000 : 5000,
        // brand colours come from the CSS variables (editable in /admin/contenu)
        colors: [cssVar("--accent", "#5eead4"), cssVar("--accent-2", "#8b7cff")],
        dpr: desktop ? Math.min(window.devicePixelRatio, 1.5) : 1,
      });
      onResize();
      pickSection();
      engine.start();
      document.documentElement.classList.add("fx-3d");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("lumen:shape", onScroll); // a component changed its data-shape (e.g. mobile swipe)

    let timer: ReturnType<typeof setTimeout> | undefined;
    const interactions = ["pointerdown", "touchstart", "keydown", "wheel", "scroll"] as const;
    const onFirstInteraction = () => {
      interactions.forEach((ev) => window.removeEventListener(ev, onFirstInteraction));
      boot();
    };
    if (desktop) {
      // after the page is idle: never competes with the first render
      timer = setTimeout(
        () => (typeof requestIdleCallback === "function" ? requestIdleCallback(() => boot(), { timeout: 2500 }) : boot()),
        600,
      );
    } else {
      interactions.forEach((ev) => window.addEventListener(ev, onFirstInteraction, { passive: true, once: true }));
    }

    return () => {
      disposed = true;
      clearTimeout(timer);
      interactions.forEach((ev) => window.removeEventListener(ev, onFirstInteraction));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("lumen:shape", onScroll);
      engine?.dispose();
      document.documentElement.classList.remove("fx-3d");
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-0 transition-opacity duration-[1.5s] [.fx-3d_&]:opacity-100"
    />
  );
}
