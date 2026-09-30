import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageData, getSite, getTexts, localizeSpecialties } from "@/lib/content";
import { hasLocale } from "@/lib/i18n";
import { getActiveSpecialties, getPublicDoctors } from "@/lib/data";
import { getRules } from "@/lib/slots";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/sections/CtaFooter";
import { Suspense } from "react";
import { BookingFlowLoader } from "@/components/booking/BookingFlowLoader";

/** Static page refreshed every minute (and at once when the clinic changes doctors/specialties). */
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[lang]/rendez-vous">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const [t, site] = await Promise.all([getTexts(lang), getSite()]);
  return { title: `${t.book.title} — ${site.identity.name}`, description: t.book.lead };
}

export default async function BookingPage({ params }: PageProps<"/[lang]/rendez-vous">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { t, site } = await getPageData(lang);
  const [specialties, doctors, rules] = await Promise.all([getActiveSpecialties(), getPublicDoctors(), getRules()]);

  // Only offer days on which at least one doctor works (the dates themselves are computed in the browser)
  const workingWeekdays = [...new Set(doctors.flatMap((d) => d.weekdays))];

  return (
    <>
      <Navbar locale={lang} t={t.nav} brand={{ name: site.identity.name, logo: site.identity.logo }} />
      <main id="contenu" className="relative isolate min-h-screen overflow-hidden pt-32 pb-24">
        <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]" />
        <div className="container-x">
          <header className="mx-auto mb-12 max-w-2xl text-center">
            <h1 className="font-display text-[clamp(2.2rem,5vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.03em] rtl:tracking-normal">
              {t.book.title}
            </h1>
            <p className="mt-4 text-lg text-muted">{t.book.lead}</p>
            <p role="note" className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
              <span aria-hidden="true">⚠</span> {t.book.emergency}
            </p>
          </header>
          <Suspense fallback={<div aria-busy="true" className="mx-auto h-[420px] max-w-3xl animate-pulse rounded-3xl border border-line bg-surface" />}>
          <BookingFlowLoader
            weekdays={workingWeekdays}
            maxDaysAhead={rules.maxDaysAhead}
            locale={lang}
            t={t.book}
            specialties={specialties.map(({ slug, durationMin }) => ({ slug, durationMin }))}
            doctors={doctors.map(({ id, name, specialty }) => ({ id, name, specialty }))}
            specs={localizeSpecialties(site, lang)}
            privacyLabel={t.privacy.link}
          />
          </Suspense>
        </div>
      </main>
      <Footer locale={lang} t={t.footer} identity={site.identity} privacy={t.privacy.link} />
    </>
  );
}
