"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight, Clock } from "lucide-react";
import { useRef, useState } from "react";
import { clinic } from "@/config/clinic";
import type { Dictionary } from "@/dictionaries";
import type { SpecialtyTexts } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";
import { Magnetic } from "@/components/fx/Magnetic";
import { scrollToY } from "@/components/layout/SmoothScroll";
import { specialtyShape } from "@/components/three/specialtyShape";
import { SpecialtyIcon } from "@/components/ui/SpecialtyIcon";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Desktop: the section is pinned while the visitor scrolls through each specialty;
 * the particles morph into a tooth, an eye, a brain… next to the text.
 */
export function SpecialtiesPinned({ locale, t, fx, specs }: { locale: Locale; t: Dictionary["specialties"]; fx: Dictionary["fx"]; specs: SpecialtyTexts }) {
  const ids = clinic.specialties;
  const n = ids.length;
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => setActive(Math.min(n - 1, Math.max(0, Math.floor(p * n)))));
  // progress inside the current specialty (0 → 1): drives continuous motion between two changes
  const local = useTransform(scrollYProgress, (p) => Math.min(1, Math.max(0, p * n - Math.min(n - 1, Math.floor(p * n)))));
  const numberY = useTransform(local, [0, 1], [30, -50]);

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollToY(top + ((el.offsetHeight - window.innerHeight) * (i + 0.5)) / n);
  };

  const id = ids[active];
  const info = specs[id];

  return (
    <>
      {/* ---------- desktop: pinned storytelling ---------- */}
      <div ref={ref} className="relative hidden lg:block" style={{ height: `${n * 60 + 10}vh` }}>
        {/* one invisible slice per specialty tells the 3D canvas which shape to draw */}
        {ids.map((sid, i) => (
          <div
            key={sid}
            aria-hidden="true"
            data-shape={specialtyShape[sid]}
            data-shape-target-ref="#specialty-stage"
            className="pointer-events-none absolute inset-x-0"
            style={{
              // aligned with the text: the viewport middle is in slice i exactly when specialty i is shown
              top: i === 0 ? 0 : `calc(${i} * (100% - 100vh) / ${n} + 50vh)`,
              height:
                i === 0 || i === n - 1
                  ? `calc((100% - 100vh) / ${n} + 50vh)`
                  : `calc((100% - 100vh) / ${n})`,
            }}
          />
        ))}

        <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
          <div className="container-x grid grid-cols-2 gap-10">
            <div className="flex flex-col justify-center">
              <h2 className="sr-only">{t.title}</h2>
              <div className="flex items-center gap-4">
                <p className="eyebrow">{t.eyebrow}</p>
                <span className="h-px w-16 bg-line-strong" />
                <p className="font-display text-sm text-subtle tabular-nums" dir="ltr">
                  {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                </p>
              </div>

              <div className="relative mt-8 min-h-[420px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={id}
                    initial={reduce ? false : { opacity: 0, y: 36, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease } }}
                    exit={{ opacity: 0, y: -24, transition: { duration: 0.18 } }}
                  >
                    <motion.span
                      aria-hidden="true"
                      style={{ y: reduce ? 0 : numberY, WebkitTextStroke: "1px rgba(255,255,255,.1)" }}
                      className="pointer-events-none absolute -top-16 font-display text-[11rem] leading-none font-bold text-transparent select-none ltr:-left-4 rtl:-right-4"
                      dir="ltr"
                    >
                      {String(active + 1).padStart(2, "0")}
                    </motion.span>
                    <span className="relative grid size-14 place-items-center rounded-2xl border border-line-strong bg-bg-2/80 text-accent backdrop-blur">
                      <SpecialtyIcon id={id} size={26} strokeWidth={1.5} />
                    </span>
                    <h3 className="relative mt-6 font-display text-[clamp(3rem,5.4vw,5.2rem)] font-semibold leading-[0.95] tracking-[-0.04em] rtl:leading-[1.2] rtl:tracking-normal">
                      {info.name}
                    </h3>
                    <p className="relative mt-5 max-w-md text-lg leading-relaxed text-muted">{info.short}</p>
                    <ul className="relative mt-6 flex max-w-md flex-wrap gap-2">
                      {info.services.map((s, i) => (
                        <motion.li
                          key={s}
                          initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 + i * 0.04, duration: 0.35, ease }}
                          className="rounded-full border border-line bg-bg/60 px-3 py-1.5 text-xs text-muted backdrop-blur"
                        >
                          {s}
                        </motion.li>
                      ))}
                    </ul>
                    <div className="relative mt-9 flex items-center gap-6">
                      <Magnetic>
                        <Link
                          href={`/${locale}/rendez-vous?specialty=${id}`}
                          className="group inline-flex items-center gap-2 rounded-xl bg-fg px-6 py-4 font-semibold text-bg"
                        >
                          {fx.bookIn} {info.name}
                          <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100" />
                        </Link>
                      </Magnetic>
                      <span className="flex items-center gap-2 text-sm text-subtle">
                        <Clock size={15} /> {info.duration} {t.minutes}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* progress rail */}
              <ol className="mt-10 grid gap-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                {ids.map((sid, i) => (
                  <li key={sid}>
                    <button type="button" onClick={() => goTo(i)} className="group w-full text-start">
                      <span className="block h-0.5 overflow-hidden rounded bg-line">
                        <motion.span
                          className="block h-full origin-left bg-gradient-to-r from-accent to-accent-2 rtl:origin-right"
                          style={{ scaleX: i < active ? 1 : i === active ? local : 0 }}
                        />
                      </span>
                      <span className={`mt-2 block truncate text-xs transition-colors ${i === active ? "text-fg" : "text-subtle group-hover:text-muted"}`}>
                        {specs[sid].name}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            {/* the particle shape is drawn in this box */}
            <div id="specialty-stage" className="relative">
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
