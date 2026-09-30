"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { Dictionary } from "@/dictionaries";
import { hasLocale, type Locale } from "@/lib/i18n";

export function NotFoundView({ texts, siteName }: { texts: Record<Locale, Dictionary["notFound"]>; siteName: string }) {
  const params = useParams<{ lang?: string }>();
  const lang: Locale = params?.lang && hasLocale(params.lang) ? params.lang : "fr";
  const t = texts[lang];
  return (
    <main id="contenu" className="relative isolate grid min-h-screen place-items-center px-5 text-center">
      {/* React 19 moves this <title> into <head>: the tab shows "Page not found — …" in the right language */}
      <title>{`${t.title} — ${siteName}`}</title>
      <div aria-hidden="true" className="aurora absolute inset-0 -z-10 opacity-60" />
      <div>
        <p className="text-gradient font-display text-[clamp(5rem,18vw,11rem)] leading-none font-bold" dir="ltr">
          404
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold">{t.title}</h1>
        <p className="mt-3 text-muted">{t.lead}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/${lang}`} className="rounded-xl bg-fg px-6 py-3 font-semibold text-bg">
            {t.home}
          </Link>
          <Link href={`/${lang}/rendez-vous`} className="rounded-xl border border-line px-6 py-3">
            {t.book}
          </Link>
        </div>
      </div>
    </main>
  );
}
