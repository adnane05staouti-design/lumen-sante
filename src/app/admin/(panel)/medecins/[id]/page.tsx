import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, Trash2 } from "lucide-react";
import { z } from "zod";
import { addAbsence, deleteAbsence, saveSchedule, updateDoctor } from "@/app/actions/admin";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { ActionForm, Field, inputCls } from "@/components/admin/ActionForm";
import { DoctorFields } from "@/components/admin/DoctorFields";
import { specialtyNames } from "@/lib/content";
import { Card, PageTitle } from "@/components/admin/ui";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function DoctorAdmin({ params }: PageProps<"/admin/medecins/[id]">) {
  await requireUser("ADMIN");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [doctor, rawSpecialties, names] = await Promise.all([
    db.query.doctors.findFirst({
      where: eq(schema.doctors.id, id),
      with: { schedules: true, absences: { orderBy: [asc(schema.absences.startsOn)] } },
    }),
    db.query.specialties.findMany({ orderBy: [asc(schema.specialties.sortOrder)] }),
    specialtyNames(),
  ]);
  if (!doctor) notFound();
  const specialties = rawSpecialties.map((s) => ({ ...s, name: names[s.slug] ?? s.slug }));

  const block = (weekday: number, i: number) =>
    doctor.schedules.filter((s) => s.weekday === weekday).sort((a, b) => a.startTime.localeCompare(b.startTime))[i];

  return (
    <>
      <Link href="/admin/medecins" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={15} /> Médecins
      </Link>
      <PageTitle title={`${doctor.title} ${doctor.firstName} ${doctor.lastName}`} />

      <Card>
        <h2 className="mb-5 font-display text-lg font-semibold">Fiche</h2>
        <ActionForm action={updateDoctor.bind(null, id)} submit="Enregistrer">
          <DoctorFields doctor={doctor} specialties={specialties} />
        </ActionForm>
      </Card>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold">Horaires de la semaine</h2>
        <p className="mt-1 text-sm text-muted">Deux plages par jour (matin / après-midi). Laissez vide pour un jour non travaillé.</p>
        <ActionForm action={saveSchedule.bind(null, id)} submit="Enregistrer les horaires" className="mt-5">
          <div className="space-y-2">
            {ORDER.map((w) => (
              <div key={w} className="grid grid-cols-[100px_1fr_1fr] items-center gap-3 text-sm">
                <span className="text-muted">{DAYS[w]}</span>
                {(["am", "pm"] as const).map((part, i) => (
                  <div key={part} className="flex items-center gap-2">
                    <input type="time" name={`${w}-${part}-start`} defaultValue={block(w, i)?.startTime} className={inputCls + " mt-0"} aria-label={`${DAYS[w]} ${part} début`} />
                    <span className="text-subtle">–</span>
                    <input type="time" name={`${w}-${part}-end`} defaultValue={block(w, i)?.endTime} className={inputCls + " mt-0"} aria-label={`${DAYS[w]} ${part} fin`} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ActionForm>
      </Card>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold">Absences et congés</h2>
        <ul className="mt-4 space-y-2">
          {doctor.absences.length === 0 && <li className="text-sm text-muted">Aucune absence prévue.</li>}
          {doctor.absences.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-2.5 text-sm">
              <span>
                {a.startsOn} → {a.endsOn} {a.reason && <span className="text-muted">· {a.reason}</span>}
              </span>
              <form action={deleteAbsence.bind(null, id, a.id)}>
                <button aria-label="Supprimer" className="text-muted hover:text-red-300">
                  <Trash2 size={16} />
                </button>
              </form>
            </li>
          ))}
        </ul>
        <ActionForm action={addAbsence.bind(null, id)} submit="Ajouter l'absence" className="mt-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Du">
              <input type="date" name="startsOn" required className={inputCls} />
            </Field>
            <Field label="Au">
              <input type="date" name="endsOn" required className={inputCls} />
            </Field>
            <Field label="Motif (interne)">
              <input name="reason" maxLength={120} className={inputCls} />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
