import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { getPageData, getSite, getTexts } from "@/lib/content";
import { hasLocale } from "@/lib/i18n";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/sections/CtaFooter";

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[lang]/confidentialite">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const [t, site] = await Promise.all([getTexts(lang), getSite()]);
  return { title: `${t.privacy.title} — ${site.identity.name}`, description: t.privacy.intro.slice(0, 160), alternates: { canonical: `/${lang}/confidentialite` } };
}

/** Privacy notice (Moroccan law 09-08). Texts are editable in /admin/contenu. */
export default async function PrivacyPage({ params }: PageProps<"/[lang]/confidentialite">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { t, site } = await getPageData(lang);
  const p = t.privacy;
  return (
    <>
      <Navbar locale={lang} t={t.nav} brand={{ name: site.identity.name, logo: site.identity.logo }} />
      <main id="contenu" className="container-x max-w-3xl pt-36 pb-24">
        <h1 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em] rtl:tracking-normal">{p.title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">{p.intro}</p>
        <div className="mt-12 space-y-8">
          {p.sections.map((s) => (
            <section key={s.t}>
              <h2 className="font-display text-xl font-semibold">{s.t}</h2>
              <p className="mt-2 leading-relaxed text-muted">{s.d}</p>
            </section>
          ))}
          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="font-display text-xl font-semibold">{p.contact}</h2>
            <ul className="mt-3 space-y-2 text-muted">
              <li className="flex items-center gap-2">
                <MapPin size={16} /> {site.identity.name} — {site.identity.address[lang]}
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} /> {site.identity.email}
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} /> <span dir="ltr">{site.identity.phone}</span>
              </li>
            </ul>
          </section>
        </div>
      </main>
      <Footer locale={lang} t={t.footer} identity={site.identity} privacy={p.link} />
    </>
  );
}
