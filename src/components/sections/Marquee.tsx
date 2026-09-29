import { clinic } from "@/config/clinic";
import type { Dictionary } from "@/dictionaries";
import type { SpecialtyTexts } from "@/lib/content-types";
import { SpecialtyIcon } from "@/components/ui/SpecialtyIcon";

/** Two infinite bands moving in opposite directions (CSS only, pauses on hover). */
export function Marquee({ t, specs }: { t: Dictionary["fx"]; specs: SpecialtyTexts }) {
  const row1 = (copy: number) => clinic.specialties.map((id) => (
    <li key={`${id}-${copy}`} aria-hidden={copy > 0 || undefined} className="flex items-center gap-4 px-8">
      <SpecialtyIcon id={id} size={30} strokeWidth={1.3} className="text-accent" />
      <span className="font-display text-[clamp(2rem,4.5vw,3.6rem)] font-semibold tracking-tight">{specs[id].name}</span>
      <span aria-hidden="true" className="ms-8 size-2 rounded-full bg-accent-2" />
    </li>
  ));
  const row2 = (copy: number) => t.marquee.map((m) => (
    <li key={`${m}-${copy}`} className="flex items-center gap-6 px-6 text-sm tracking-[0.2em] text-muted uppercase rtl:tracking-normal">
      {m}
      <span aria-hidden="true" className="text-accent">✦</span>
    </li>
  ));
  return (
    <section aria-label={t.services} className="marquee-wrap relative overflow-hidden border-y border-line bg-bg/40 py-8 backdrop-blur-sm">
      <div className="[mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <ul className="marquee" style={{ "--speed": "45s" } as React.CSSProperties}>
          {row1(0)}
          {row1(1)}
        </ul>
        <ul aria-hidden="true" className="marquee marquee-reverse mt-5" style={{ "--speed": "38s" } as React.CSSProperties}>
          {row2(0)}
          {row2(1)}
        </ul>
      </div>
    </section>
  );
}
