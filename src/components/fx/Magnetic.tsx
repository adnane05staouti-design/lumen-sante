"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Makes its child follow the mouse a little when hovered ("magnetic" button),
 * then spring back. Mouse only; does nothing on touch screens.
 */
export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const cur = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const loop = () => {
      cur.x += (target.x - cur.x) * 0.16;
      cur.y += (target.y - cur.y) * 0.16;
      el.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
      if (Math.abs(target.x - cur.x) > 0.05 || Math.abs(target.y - cur.y) > 0.05) frame = requestAnimationFrame(loop);
      else frame = 0;
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = (e.clientX - (r.left + r.width / 2)) * strength;
      target.y = (e.clientY - (r.top + r.height / 2)) * strength;
      kick();
    };
    const onLeave = () => {
      target.x = target.y = 0;
      kick();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);

  return (
    <span ref={ref} className={`inline-block will-change-transform ${className ?? ""}`}>
      {children}
    </span>
  );
}
