import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { clinic } from "@/config/clinic";
import type { Dictionary } from "@/dictionaries";
import type { SpecialtyTexts } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";
import { Magnetic } from "@/components/fx/Magnetic";
import { BookingWidget } from "./BookingWidget";

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

/**
 * Hero: server-rendered, animated with CSS only (no JavaScript needed for the first paint).
 * The particle sphere is drawn by the page-wide canvas inside [data-shape-target];
 * a CSS sphere stands in until it is ready (or on devices without 3D).
 */
export function Hero({ locale, t, specs }: { locale: Locale; t: Dictionary; specs: SpecialtyTexts }) {
  const words = t.hero.title1.split(" ");
  // "title2" starts with punctuation (", à portée de clic."): keep its first token next to the highlight
  const [lead2, ...restWords] = t.hero.title2.trim().split(" ");
  const rest2 = restWords.join(" ");
  return (
    <section data-shape="sphere" className="relative isolate overflow-hidden pt-28 pb-16 md:pt-36 lg:min-h-[100svh] lg:pb-10">
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(70%_70%_at_70%_40%,black,transparent)]" />
      <div aria-hidden="true" className="aurora absolute inset-[-10%] -z-20 opacity-70" />

      <div className="container-x grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="hero-in inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-muted backdrop-blur" style={d(0.05)}>
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            {t.hero.badge}
          </span>

          <h1 className="mt-7 font-display text-[clamp(2.8rem,6.6vw,5.9rem)] font-semibold leading-[0.96] tracking-[-0.045em] rtl:leading-[1.25] rtl:tracking-normal">
            {words.map((w, i) => (
              <span key={i} className="hero-word" style={d(0.1 + i * 0.08)}>
                {w}&nbsp;
              </span>
            ))}
            {/* highlight + following punctuation stay on the same line */}
            <span className="whitespace-nowrap">
              <span className="hero-word text-gradient" style={d(0.1 + words.length * 0.08)}>
                {t.hero.highlight}
              </span>
              <span className="hero-word" style={d(0.2 + words.length * 0.08)}>
                {lead2}
              </span>
            </span>
            {rest2 && " "}
            {rest2 && (
              <span className="hero-word" style={d(0.28 + words.length * 0.08)}>
                {rest2}
              </span>
            )}
          </h1>

          <p className="hero-in mt-7 max-w-xl text-lg leading-relaxed text-muted" style={d(0.45)}>
            {t.hero.lead}
          </p>

          <div className="hero-in mt-9 flex flex-wrap items-center gap-3" style={d(0.6)}>
            <Magnetic>
              <Link
                href={`/${locale}/rendez-vous`}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-6 py-4 font-bold text-[#04121a] shadow-[0_10px_40px_-10px_rgba(94,234,212,.6)]"
                style={{ background: "linear-gradient(90deg, var(--accent), #7dd3fc)" }}
              >
                <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,.55)_50%,transparent_70%)] transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">{t.hero.cta}</span>
                <ArrowRight size={18} className="relative transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Link>
            </Magnetic>
            <a
              href={`/${locale}#centre`}
              className="inline-flex items-center rounded-xl border border-line px-6 py-4 backdrop-blur transition-colors hover:border-line-strong hover:bg-surface"
            >
              {t.hero.cta2}
            </a>
          </div>

          <ul className="hero-in mt-14 flex flex-wrap gap-x-7 gap-y-3 font-display text-xs tracking-[0.18em] text-subtle uppercase rtl:tracking-normal" style={d(0.75)}>
            {clinic.specialties.slice(0, 4).map((id) => (
              <li key={id}>{specs[id].name}</li>
            ))}
          </ul>
        </div>

        <div className="relative lg:h-[660px]">
          {/* the particle sphere is drawn in this box */}
          <div
            data-shape-target
            className="relative mx-auto aspect-square w-full max-w-[520px] lg:absolute lg:top-[-30px] lg:w-[560px] lg:max-w-none ltr:lg:left-[-40px] rtl:lg:right-[-40px]"
          >
            <div aria-hidden="true" className="orb-fallback hero-in grid h-full w-full place-items-center transition-[opacity,transform] duration-1000" style={d(0.2)}>
              <div
                className="size-[58%] rounded-full"
                style={{
                  background: "radial-gradient(circle at 32% 28%, #f2fffd 0%, #8ff3e4 10%, #3cc8c0 28%, #3b3fa8 62%, #12143a 82%)",
                  boxShadow: "0 0 120px rgba(94,234,212,.35), inset -40px -60px 90px rgba(0,0,0,.55)",
                }}
              />
            </div>
          </div>

          <div className="hero-in relative z-10 mx-auto -mt-16 w-full max-w-[370px] lg:absolute lg:bottom-0 lg:mt-0 ltr:lg:right-0 rtl:lg:left-0" style={d(0.85)}>
            <BookingWidget locale={locale} t={t.booking} specs={specs} />
          </div>

          <div className="hero-in absolute top-[300px] z-10 hidden xl:block ltr:left-[-70px] rtl:right-0" style={d(1.05)}>
            <div className="float glass rounded-2xl px-5 py-4">
              <p className="font-display text-2xl font-semibold" dir="ltr">&lt; 60 s</p>
              <p className="text-sm text-muted">{t.hero.fast}</p>
            </div>
          </div>
        </div>
      </div>

      <a
        href="#specialites"
        className="hero-in absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs tracking-[0.2em] text-subtle uppercase lg:flex rtl:tracking-normal"
        style={d(1.2)}
      >
        {t.fx.scroll}
        <ChevronDown size={16} className="animate-bounce" />
      </a>
      <p className="hero-in absolute bottom-7 hidden text-[0.7rem] text-subtle [.fx-3d_&]:lg:block ltr:right-10 rtl:left-10" style={d(2)}>
        ✦ {t.fx.hint}
      </p>
    </section>
  );
}
