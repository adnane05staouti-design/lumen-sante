"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { CalendarCheck, MousePointerClick, Stethoscope } from "lucide-react";
import { useRef, useState } from "react";
import type { Dictionary } from "@/dictionaries";
import { TextReveal } from "@/components/fx/TextReveal";

const icons = [Stethoscope, MousePointerClick, CalendarCheck];

/**
 * Three steps along a vertical line that fills while scrolling;
 * each step lights up when the line reaches it. The particles form a DNA helix beside it.
 */
export function Process({ t }: { t: Dictionary["process"] }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const [reached, setReached] = useState(-1);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 55%"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
  useMotionValueEvent(scrollYProgress, "change", (p) => setReached(Math.floor(p * t.steps.length * 0.999 + 0.35) - 1));

  return (
    <section className="relative py-24 md:py-36" data-shape="dna">
      <div className="container-x grid gap-14 lg:grid-cols-2">
        {/* the DNA helix is drawn in this box (desktop) */}
        <div data-shape-target className="hidden lg:block lg:sticky lg:top-[15vh] lg:h-[70vh]" />

        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <TextReveal
            text={t.title}
            className="mt-4 font-display text-[clamp(2.2rem,4.4vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em] rtl:leading-[1.25] rtl:tracking-normal"
          />

          <ol ref={ref} className="relative mt-16 space-y-14 ps-20">
            <span aria-hidden="true" className="absolute top-2 bottom-2 w-px bg-line ltr:left-7 rtl:right-7" />
            <motion.span
              aria-hidden="true"
              style={{ scaleY: reduce ? 1 : scaleY }}
              className="absolute top-2 bottom-2 w-px origin-top bg-gradient-to-b from-accent to-accent-2 ltr:left-7 rtl:right-7"
            />
            {t.steps.map((s, i) => {
              const Icon = icons[i % icons.length];
              const on = reduce || i <= reached;
              return (
                <li key={s.t} className="relative">
                  <span
                    className={`absolute top-0 grid size-14 place-items-center rounded-2xl border transition-all duration-700 ltr:-left-20 rtl:-right-20 ${
                      on ? "border-transparent bg-accent text-[#04121a] shadow-[0_0_40px_-6px_var(--accent)]" : "border-line-strong bg-bg text-subtle"
                    }`}
                  >
                    <Icon size={22} strokeWidth={1.7} />
                  </span>
                  <p className={`font-display text-sm tabular-nums transition-colors duration-700 ${on ? "text-accent" : "text-subtle"}`} dir="ltr">
                    0{i + 1}
                  </p>
                  <h3 className={`mt-1 font-display text-3xl font-semibold transition-opacity duration-700 ${on ? "opacity-100" : "opacity-55"}`}>{s.t}</h3>
                  <p className={`mt-2 max-w-md leading-relaxed text-muted transition-opacity duration-700 ${on ? "opacity-100" : "opacity-85"}`}>{s.d}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
