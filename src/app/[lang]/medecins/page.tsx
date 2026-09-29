import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Languages } from "lucide-react";
import { getPageData, getSite, getTexts } from "@/lib/content";
import { hasLocale } from "@/lib/i18n";
import { getPublicDoctors } from "@/lib/data";
import { Navbar } from "@/components/layout/Navbar";
import { ParticleStage } from "@/components/three/ParticleStage";
import { Footer } from "@/components/sections/CtaFooter";
import { Reveal } from "@/components/ui/Reveal";
import { SpecialtyIcon } from "@/components/ui/SpecialtyIcon";

/** Regenerated at most every 5 minutes: fast like a static page, still up to date. */
export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[lang]/medecins">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const [dict, site] = await Promise.all([getTexts(lang), getSite()]);
  const t = dict.doctorsPage;
  return { title: `${t.eyebrow} — ${site.identity.name}`, description: t.lead };
}

const langName: Record<string, string> = { fr: "Français", ar: "العربية", en: "English", es: "Español", de: "Deutsch" };

export default async function DoctorsPage({ params }: PageProps<"/[lang]/medecins">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { t: dict, site } = await getPageData(lang);
  const t = dict.doctorsPage;
  const doctors = await getPublicDoctors().catch(() => []);

  return (
    <>
      <ParticleStage />
      <Navbar locale={lang} t={dict.nav} brand={{ name: site.identity.name, logo: site.identity.logo }} />
      <main id="contenu" className="relative isolate overflow-hidden pt-36 pb-24">
        <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]" />
        <div className="container-x">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{t.eyebrow}</p>
            <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.03em] rtl:tracking-normal">
              {t.title}
            </h1>
            <p className="mt-5 text-lg text-muted">{t.lead}</p>
          </Reveal>

          {doctors.length === 0 ? (
            <p className="mt-16 text-muted">{t.empty}</p>
          ) : (
            <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((d, i) => (
                <li key={d.id}>
                  <Reveal delay={(i % 3) * 0.08} className="h-full">
                    <article className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-7 transition-colors hover:border-line-strong">
                      <div className="flex items-center gap-4">
                        <span
                          aria-hidden="true"
                          className="grid size-16 shrink-0 place-items-center rounded-2xl font-display text-xl font-semibold text-[#04121a]"
                          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
                        >
                          {d.initials}
                        </span>
                        <div>
                          <h2 className="font-display text-xl font-semibold">{d.name}</h2>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-accent">
                            <SpecialtyIcon id={d.specialty} size={14} /> {site.specialties[d.specialty].name[lang]}
                          </p>
                        </div>
                      </div>
                      {d.bio[lang] && <p className="mt-5 leading-relaxed text-muted">{d.bio[lang]}</p>}
                      <p className="mt-5 flex items-center gap-2 text-sm text-muted">
                        <Languages size={15} /> {d.languages.map((l) => langName[l] ?? l).join(" · ")}
                      </p>
                      <a
                        href={`/${lang}/rendez-vous?specialty=${d.specialty}&doctor=${d.id}`}
                        className="mt-auto inline-flex items-center gap-1.5 pt-7 text-sm font-semibold transition-colors hover:text-accent"
                      >
                        {t.book} <ArrowUpRight size={16} className="rtl:-scale-x-100" />
                      </a>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer locale={lang} t={dict.footer} identity={site.identity} privacy={dict.privacy.link} />
    </>
  );
}
