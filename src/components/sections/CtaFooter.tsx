import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import type { Identity } from "@/lib/content-types";
import { LogoMark } from "@/components/ui/Logo";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { Magnetic } from "@/components/fx/Magnetic";
import { TextReveal } from "@/components/fx/TextReveal";

export function Cta({ locale, t, call, phone }: { locale: Locale; t: Dictionary["cta"]; call: string; phone: string }) {
  return (
    <section className="relative scroll-mt-20 py-24 md:py-40" data-shape="sphere" data-shape-dim="0.55">
      <div className="container-x relative text-center">
        <div data-shape-target aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto aspect-square w-[min(90vw,640px)] -translate-y-1/2" />
        <TextReveal
          text={t.title}
          className="relative mx-auto max-w-4xl font-display text-[clamp(2.6rem,7vw,6.2rem)] font-semibold leading-[0.98] tracking-[-0.045em] rtl:leading-[1.25] rtl:tracking-normal"
        />
        <Reveal delay={0.2}>
          <p className="relative mx-auto mt-6 max-w-xl text-lg text-muted">{t.lead}</p>
          <div className="relative mt-12 flex flex-wrap items-center justify-center gap-4">
            <Magnetic strength={0.4}>
              <Link
                href={`/${locale}/rendez-vous`}
                className="group inline-flex items-center gap-3 rounded-full bg-fg py-5 ps-8 pe-3 text-lg font-bold text-bg shadow-[0_0_80px_-20px_var(--accent)]"
              >
                {t.button}
                <span className="grid size-11 place-items-center rounded-full bg-bg text-fg transition-transform duration-500 group-hover:rotate-[-45deg] rtl:group-hover:rotate-[225deg] rtl:rotate-180">
                  <ArrowRight size={18} />
                </span>
              </Link>
            </Magnetic>
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-4 backdrop-blur transition-colors hover:border-line-strong">
              <Phone size={16} /> {call}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer({ locale, t, identity, privacy }: { locale: Locale; t: Dictionary["footer"]; identity: Identity; privacy?: string }) {
  return (
    <footer id="contact" className="relative scroll-mt-20 overflow-hidden border-t border-line bg-bg/70 pt-16 pb-8 backdrop-blur-sm">
      <div className="container-x grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2.5 font-display text-lg font-semibold">
            <LogoMark logo={identity.logo} />
            {identity.name}
          </p>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted">
            <MapPin size={16} className="mt-0.5 shrink-0" /> {identity.address[locale]}
          </p>
        </div>
        <div>
          <p className="font-display text-sm font-semibold">{t.hours}</p>
          <dl className="mt-4 space-y-2 text-sm text-muted">
            <div className="flex justify-between gap-4">
              <dt>{t.weekdays}</dt>
              <dd dir="ltr">{identity.hours.weekdays}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{t.saturday}</dt>
              <dd dir="ltr">{identity.hours.saturday}</dd>
            </div>
          </dl>
        </div>
        <div>
          <p className="font-display text-sm font-semibold">{t.contact}</p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <Phone size={15} /> <span dir="ltr">{identity.phone}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={15} /> {identity.email}
            </li>
          </ul>
        </div>
      </div>
      <p
        aria-hidden="true"
        className="mt-16 overflow-hidden text-center font-display text-[clamp(3.5rem,15vw,15rem)] leading-[0.85] font-bold tracking-[-0.06em] whitespace-nowrap text-transparent select-none"
        style={{ WebkitTextStroke: "1px rgba(255,255,255,.12)", backgroundImage: "linear-gradient(180deg, color-mix(in oklab, var(--accent) 14%, transparent), transparent 80%)", WebkitBackgroundClip: "text", backgroundClip: "text" }}
      >
        {identity.name}
      </p>
      <div className="container-x mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-6 text-xs text-subtle">
        <p>
          © {new Date().getFullYear()} {identity.name}. {t.rights}
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {privacy && (
            <Link href={`/${locale}/confidentialite`} className="underline-offset-4 hover:text-fg hover:underline">
              {privacy}
            </Link>
          )}
          <span>{t.demo}</span>
        </p>
      </div>
    </footer>
  );
}
