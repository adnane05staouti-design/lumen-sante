import Link from "next/link";
import { and, asc, count, eq, gte, inArray, lt } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { db, schema } from "@/db";
import { specialtyNames } from "@/lib/content";
import { requireUser } from "@/lib/auth";
import { addDays, clinicDay, clinicTime, clinicTimeToUtc } from "@/lib/time";
import { Card, PageTitle, StatusBadge } from "@/components/admin/ui";

export default async function Dashboard() {
  const user = await requireUser();
  const today = clinicDay(new Date());
  const start = clinicTimeToUtc(today, "00:00");
  const tomorrow = clinicTimeToUtc(addDays(today, 1), "00:00");
  const weekEnd = clinicTimeToUtc(addDays(today, 7), "00:00");
  const active = inArray(schema.appointments.status, ["PENDING", "CONFIRMED"]);

  const countWhere = async (...conds: Parameters<typeof and>) =>
    (await db.select({ n: count() }).from(schema.appointments).where(and(...conds)))[0].n;

  const [todayCount, weekCount, pendingCount, doctorsCount, todayList, names] = await Promise.all([
    countWhere(active, gte(schema.appointments.startsAt, start), lt(schema.appointments.startsAt, tomorrow)),
    countWhere(active, gte(schema.appointments.startsAt, start), lt(schema.appointments.startsAt, weekEnd)),
    countWhere(eq(schema.appointments.status, "PENDING"), gte(schema.appointments.startsAt, new Date())),
    db.select({ n: count() }).from(schema.doctors).where(eq(schema.doctors.active, true)).then((r) => r[0].n),
    db.query.appointments.findMany({
      where: and(gte(schema.appointments.startsAt, start), lt(schema.appointments.startsAt, tomorrow)),
      with: { doctor: true, specialty: true },
      orderBy: [asc(schema.appointments.startsAt)],
    }),
    specialtyNames(),
  ]);

  const stats = [
    { label: "Rendez-vous aujourd'hui", value: todayCount },
    { label: "Sur 7 jours", value: weekCount },
    { label: "À confirmer", value: pendingCount },
    { label: "Médecins actifs", value: doctorsCount },
  ];

  return (
    <>
      <PageTitle title={`Bonjour ${user.name.split(" ")[0]}`} lead="Voici l'activité du cabinet." />
      {!user.mfa && (
        <p role="note" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          Protégez l&apos;accès aux données des patients : activez la double authentification.
          <Link href="/admin/compte" className="font-semibold underline underline-offset-4">
            Activer maintenant
          </Link>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-2 font-display text-4xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Aujourd&apos;hui</h2>
          <Link href="/admin/rendez-vous" className="flex items-center gap-1 text-sm text-accent">
            Tous les rendez-vous <ArrowRight size={15} />
          </Link>
        </div>
        {todayList.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Aucun rendez-vous aujourd&apos;hui.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {todayList.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-4 py-3 text-sm">
                <span className="w-14 font-display text-base font-semibold">{clinicTime(a.startsAt)}</span>
                <span className="min-w-40 flex-1">
                  {a.patientName}
                  <span className="block text-xs text-muted">
                    {names[a.specialty.slug] ?? a.specialty.slug} · {a.doctor.title} {a.doctor.lastName}
                  </span>
                </span>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
