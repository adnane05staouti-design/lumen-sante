import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { fontVars } from "@/lib/fonts";
import { dirOf, hasLocale, locales } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";
import { getSite, getTexts, mediaUrl } from "@/lib/content";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Intro } from "@/components/fx/Intro";
import { TiltCards } from "@/components/fx/TiltCards";
import { InView } from "@/components/fx/InView";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const [t, site] = await Promise.all([getTexts(lang), getSite()]);
  return {
    applicationName: site.identity.name,
    icons: site.identity.logo ? { icon: mediaUrl(site.identity.logo) } : undefined,
    metadataBase: new URL(siteUrl()),
    title: t.meta.title,
    description: t.meta.description,
    alternates: { canonical: `/${lang}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
    openGraph: { title: t.meta.title, description: t.meta.description, type: "website", locale: lang },
  };
}

export const viewport: Viewport = { themeColor: "#060a13" };

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [{ identity }, t] = await Promise.all([getSite(), getTexts(lang)]);
  return (
    <html
      lang={lang}
      className={fontVars}
      dir={dirOf(lang)}
      style={{ "--accent": identity.theme.accent, "--accent-2": identity.theme.accent2 } as React.CSSProperties}
    >
      <body className="grain">
        <a href="#contenu" className="skip-link">
          {t.nav.skip}
        </a>
        <Intro name={identity.name} />
        <TiltCards />
        <SmoothScroll />
        <InView />
        {children}
        <WhatsAppButton number={identity.whatsapp} label="WhatsApp" />
      </body>
    </html>
  );
}
