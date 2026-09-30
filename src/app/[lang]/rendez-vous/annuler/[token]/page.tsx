import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { cancelByToken } from "@/app/actions/booking";
import { db, schema } from "@/db";
import { getPageData } from "@/lib/content";
import { hasLocale } from "@/lib/i18n";
import { formatLong } from "@/lib/time";
import { hashToken } from "@/lib/tokens";
import { Navbar } from "@/components/layout/Navbar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function CancelPage({ params, searchParams }: PageProps<"/[lang]/rendez-vous/annuler/[token]">) {
  const { lang, token } = await params;
  if (!hasLocale(lang)) notFound();
  const { t: dict, site } = await getPageData(lang);
  const t = dict.cancelPage;
  const done = (await searchParams).done;

  const appt = /^[A-Za-z0-9_-]{20,64}$/.test(token)
    ? await db.query.appointments.findFirst({
        where: eq(schema.appointments.cancelToken, hashToken(token)),
        with: { doctor: true, specialty: true },
      })
    : undefined;

  async function cancel() {
    "use server";
    const res = await cancelByToken(token);
    const { redirect } = await import("next/navigation");
    redirect(`/${lang}/rendez-vous/annuler/${token}?done=${res.ok ? "1" : res.error}`);
  }

  let message: string | null = null;
  if (done === "1") message = t.done;
  else if (done === "late") message = t.late;
  else if (!appt || done === "notfound") message = t.notfound;
  else if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") message = t.already;

  return (
    <>
      <Navbar locale={lang} t={dict.nav} brand={{ name: site.identity.name, logo: site.identity.logo }} />
      <main id="contenu" className="grid min-h-screen place-items-center px-5 pt-24 pb-16">
        <div className="glass w-full max-w-lg rounded-3xl p-8 text-center md:p-10">
          <h1 className="font-display text-3xl font-semibold">{t.title}</h1>
          {appt && !message && (
            <>
              <p className="mt-6 text-muted">
                {site.specialties[appt.specialty.slug as keyof typeof site.specialties]?.name[lang]} · {appt.doctor.title} {appt.doctor.firstName}{" "}
                {appt.doctor.lastName}
              </p>
              <p className="mt-1 font-display text-lg">{formatLong(appt.startsAt, lang)}</p>
              <form action={cancel} className="mt-8">
                <button className="w-full rounded-xl border border-red-400/40 bg-red-400/10 px-6 py-4 font-semibold text-red-200 hover:bg-red-400/20">
                  {t.confirm}
                </button>
              </form>
            </>
          )}
          {message && <p className="mt-6 text-muted">{message}</p>}
          <Link href={`/${lang}`} className="mt-8 inline-block text-sm text-accent">
            {t.home}
          </Link>
        </div>
      </main>
    </>
  );
}
