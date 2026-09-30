import { and, asc, desc, eq, gte, ilike, lt, or, type SQL } from "drizzle-orm";
import { setAppointmentStatus } from "@/app/actions/admin";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getSite } from "@/lib/content";
import { addDays, clinicDay, clinicTime, clinicTimeToUtc, requestTime } from "@/lib/time";
import { Card, PageTitle, STATUS_LABEL, StatusBadge } from "@/components/admin/ui";
import { inputCls } from "@/components/admin/ActionForm";

const STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
type Status = (typeof STATUSES)[number];

export default async function AppointmentsPage({ searchParams }: PageProps<"/admin/rendez-vous">) {
  await requireUser();
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const day = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.day)) ? str(sp.day) : clinicDay(new Date());
  const rangeParam = str(sp.range);
  const range = rangeParam === "week" ? 7 : rangeParam === "all" ? 0 : 1; // 0 = every date (search a patient's history)
  const status = STATUSES.includes(str(sp.status) as Status) ? (str(sp.status) as Status) : "";
  const q = str(sp.q).trim().slice(0, 60);

  const MAX = 300;
  const now = requestTime();
  const conds: (SQL | undefined)[] = [
    range ? gte(schema.appointments.startsAt, clinicTimeToUtc(day, "00:00")) : undefined,
    range ? lt(schema.appointments.startsAt, clinicTimeToUtc(addDays(day, range), "00:00")) : undefined,
    status ? eq(schema.appointments.status, status) : undefined,
    q
      ? or(
          ilike(schema.appointments.patientName, `%${q}%`),
          ilike(schema.appointments.patientPhone, `%${q}%`),
          ilike(schema.appointments.reference, `%${q}%`),
        )
      : undefined,
  ];
  const [rows, site] = await Promise.all([
    db.query.appointments.findMany({
      where: and(...conds),
      with: { doctor: true, specialty: true },
      orderBy: [range ? asc(schema.appointments.startsAt) : desc(schema.appointments.startsAt)],
      limit: MAX,
    }),
    getSite(),
  ]);
  const specialtyName = (slug: string) => site.specialties[slug as keyof typeof site.specialties]?.name.fr ?? slug;

  return (
    <>
      <PageTitle
        title="Rendez-vous"
        lead={rows.length >= MAX ? `${MAX} premiers résultats — affinez la recherche` : `${rows.length} rendez-vous${range ? "" : " (toutes dates, du plus récent au plus ancien)"}`}
      />
      <Card>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="date" name="day" defaultValue={day} className={inputCls} aria-label="Jour" />
          <select name="range" defaultValue={range === 7 ? "week" : range === 0 ? "all" : "day"} className={inputCls} aria-label="Période">
            <option value="day">Ce jour</option>
            <option value="week">7 jours</option>
            <option value="all">Toutes les dates</option>
          </select>
          <select name="status" defaultValue={status} className={inputCls} aria-label="Statut">
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <input name="q" defaultValue={q} placeholder="Patient, téléphone, référence…" aria-label="Rechercher" className={inputCls} />
          <button className="mt-1.5 rounded-lg bg-fg px-4 py-2.5 text-sm font-semibold text-bg">Filtrer</button>
        </form>
      </Card>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-surface text-start text-xs text-muted">
            <tr>
              {["Date", "Patient", "Spécialité / médecin", "Référence", "Statut", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  Aucun rendez-vous pour ces filtres.
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr key={a.id} className="align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-display font-semibold">{clinicTime(a.startsAt)}</span>
                  <span className="block text-xs text-muted">{clinicDay(a.startsAt).split("-").reverse().join("/")}</span>
                </td>
                <td className="px-4 py-3">
                  {a.patientName}
                  <span className="block text-xs text-muted">
                    {a.patientPhone} · {a.patientEmail}
                  </span>
                  {a.reason && <span className="mt-1 block max-w-xs text-xs text-subtle">« {a.reason} »</span>}
                </td>
                <td className="px-4 py-3">
                  {specialtyName(a.specialty.slug)}
                  <span className="block text-xs text-muted">
                    {a.doctor.title} {a.doctor.firstName} {a.doctor.lastName}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{a.reference}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(a.status === "PENDING"
                      ? (["CONFIRMED", "CANCELLED"] as const)
                      : a.status === "CONFIRMED"
                        ? a.startsAt.getTime() <= now
                          ? (["COMPLETED", "NO_SHOW", "CANCELLED"] as const)
                          : (["CANCELLED"] as const) // "done" / "no-show" only once the appointment has started
                        : a.status === "NO_SHOW"
                          ? (["COMPLETED"] as const) // patient finally came (late)
                          : []
                    ).map((next) => (
                      <form key={next} action={setAppointmentStatus.bind(null, a.id, next)}>
                        <button className="rounded-md border border-line px-2 py-1 text-xs hover:bg-surface-2">
                          {next === "CONFIRMED" ? "Confirmer" : next === "CANCELLED" ? "Annuler" : next === "COMPLETED" ? "Terminé" : "Absent"}
                        </button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
