import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { clinic } from "@/config/clinic";
import type { Dictionary } from "@/dictionaries";
import type { SpecialtyTexts } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";
import { TextReveal } from "@/components/fx/TextReveal";
import { SpecialtyIcon } from "@/components/ui/SpecialtyIcon";
import { specialtyShape } from "@/components/three/specialtyShape";
import { SpecialtiesPinned } from "./SpecialtiesPinned";
import { SpecialtiesSwipe } from "./SpecialtiesSwipe";


/**
 * Specialties: pinned 3D storytelling on desktop (client component),
 * a swipe carousel on phones with a light 3D stage whose shape follows the centred card.
 */
export function Specialties({ locale, t, fx, specs }: { locale: Locale; t: Dictionary["specialties"]; fx: Dictionary["fx"]; specs: SpecialtyTexts }) {
  const ids = clinic.specialties;
  return (
    <section id="specialites" className="relative scroll-mt-20" data-shape="field" data-shape-dim="0.4">
      <SpecialtiesPinned locale={locale} t={t} fx={fx} specs={specs} />

      {/* ---------- phones & tablets: swipe carousel + light 3D stage ---------- */}
      <SpecialtiesSwipe
        shapes={ids.map((sid) => specialtyShape[sid])}
        labels={ids.map((sid) => specs[sid].name)}
        header={
          <div className="container-x">
            <p className="eyebrow">{t.eyebrow}</p>
            <TextReveal text={t.title} className="mt-4 font-display text-[clamp(2rem,7vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] rtl:tracking-normal" />
            <p className="mt-4 text-muted">{t.lead}</p>
          </div>
        }
      >
        {ids.map((sid) => {
          const s = specs[sid];
          return (
            <li key={sid} className="w-[82%] max-w-[360px] shrink-0 snap-center">
              <article className="h-full overflow-hidden rounded-3xl border border-line bg-bg-2/70 backdrop-blur">
                {/* no photo needed: a large glowing icon on the brand gradient (smaller when the 3D stage is on) */}
                <div
                  aria-hidden="true"
                  className="relative grid aspect-[16/10] place-items-center overflow-hidden [.fx-3d_&]:aspect-[16/5]"
                  style={{ background: "radial-gradient(70% 90% at 30% 20%, color-mix(in oklab, var(--accent) 28%, transparent), transparent 70%), radial-gradient(60% 80% at 80% 90%, color-mix(in oklab, var(--accent-2) 30%, transparent), transparent 70%)" }}
                >
                  <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_50%,black,transparent)]" />
                  <SpecialtyIcon id={sid} size={72} strokeWidth={1} className="float relative text-accent drop-shadow-[0_0_24px_var(--accent)] [.fx-3d_&]:size-10" />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl font-semibold">{s.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.short}</p>
                  <Link
                    href={`/${locale}/rendez-vous?specialty=${sid}`}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
                  >
                    {t.book} <ArrowUpRight size={16} className="rtl:-scale-x-100" />
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </SpecialtiesSwipe>
    </section>
  );
}
