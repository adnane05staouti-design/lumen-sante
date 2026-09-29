import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { Specialties } from "@/components/sections/Specialties";
import { Stats } from "@/components/sections/Stats";
import { Gallery } from "@/components/sections/Gallery";
import { Process } from "@/components/sections/Process";
import { Cta, Footer } from "@/components/sections/CtaFooter";
import { ParticleStage } from "@/components/three/ParticleStage";
import { getHomeCounts } from "@/lib/data";
import { getPageData, localizeSpecialties } from "@/lib/content";

/** Static page, refreshed every 5 minutes (live figures from the database). */
export const revalidate = 300;

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [{ t, site }, counts] = await Promise.all([getPageData(lang), getHomeCounts()]);
  const specs = localizeSpecialties(site, lang);
  const brand = { name: site.identity.name, logo: site.identity.logo };
  return (
    <>
      <ParticleStage />
      <Navbar locale={lang} t={t.nav} brand={brand} />
      <main id="contenu">
        <Hero locale={lang} t={t} specs={specs} />
        <Marquee t={t.fx} specs={specs} />
        <Specialties locale={lang} t={t.specialties} fx={t.fx} specs={specs} />
        <Stats locale={lang} eyebrow={t.fx.statsEyebrow} counts={counts} items={site.stats} />
        <Gallery locale={lang} t={t.fx} center={t.center} gallery={site.gallery} />
        <Process t={t.process} />
        <Cta locale={lang} t={t.cta} call={t.fx.call} phone={site.identity.phone} />
      </main>
      <Footer locale={lang} t={t.footer} identity={site.identity} privacy={t.privacy.link} />
    </>
  );
}
