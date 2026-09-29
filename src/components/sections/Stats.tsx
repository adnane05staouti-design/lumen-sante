"use client";

import { useEffect, useRef } from "react";
import type { Stat } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

/** Key figures that count up when they scroll into view. */
export function Stats({
  locale,
  eyebrow,
  counts,
  items,
}: {
  locale: Locale;
  eyebrow: string;
  counts: { doctors: number; specialties: number };
  items: Stat[];
}) {
  const stats = items
    .map((s) => ({ ...s, value: s.live === "doctors" ? counts.doctors : s.live === "specialties" ? counts.specialties : s.value }))
    .filter((s) => s.value > 0);
  const ref = useRef<HTMLDListElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nums = [...root.querySelectorAll<HTMLElement>("[data-count]")];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        if (reduce) return;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / 1800);
          const eased = 1 - Math.pow(1 - p, 4);
          nums.forEach((el) => (el.textContent = String(Math.round(Number(el.dataset.count) * eased))));
          if (p < 1) requestAnimationFrame(tick);
        };
        nums.forEach((el) => (el.textContent = "0"));
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative py-20 md:py-28">
      <div className="container-x">
        <p className="eyebrow text-center">{eyebrow}</p>
        <dl ref={ref} className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label.fr} data-tilt className="group relative flex flex-col rounded-3xl border border-line bg-bg/70 px-6 py-10 text-center backdrop-blur transition-colors hover:bg-bg-2/80 md:py-14">
              <dt className="order-2 mt-2 text-sm text-muted">{s.label[locale]}</dt>
              <dd className="font-display text-[clamp(2.6rem,5vw,4.2rem)] font-semibold tracking-tight" dir="ltr">
                <span className="text-gradient">
                  {s.prefix}
                  <span data-count={s.value} className="tabular-nums">
                    {s.value}
                  </span>
                  {s.suffix}
                </span>
              </dd>
              <span aria-hidden="true" className="absolute inset-x-8 bottom-0 h-px scale-x-0 bg-gradient-to-r from-accent to-accent-2 transition-transform duration-700 group-hover:scale-x-100" />
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
