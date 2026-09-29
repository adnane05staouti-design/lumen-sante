import Link from "next/link";
import { asc } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { createDoctor } from "@/app/actions/admin";
import { db, schema } from "@/db";
import { specialtyNames } from "@/lib/content";
import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/admin/ActionForm";
import { DoctorFields } from "@/components/admin/DoctorFields";
import { Card, PageTitle } from "@/components/admin/ui";

export default async function DoctorsAdmin() {
  await requireUser("ADMIN");
  const [doctors, rawSpecialties, names] = await Promise.all([
    db.query.doctors.findMany({ with: { specialty: true }, orderBy: [asc(schema.doctors.lastName)] }),
    db.query.specialties.findMany({ orderBy: [asc(schema.specialties.sortOrder)] }),
    specialtyNames(),
  ]);
  const specialties = rawSpecialties.map((s) => ({ ...s, name: names[s.slug] ?? s.slug }));

  return (
    <>
      <PageTitle title="Médecins" lead="Fiches, horaires et absences." />
      <div className="overflow-hidden rounded-2xl border border-line">
        {doctors.map((d) => (
          <Link
            key={d.id}
            href={`/admin/medecins/${d.id}`}
            className="flex items-center justify-between border-b border-line px-5 py-4 last:border-b-0 hover:bg-surface"
          >
            <span>
              <span className="font-medium">
                {d.title} {d.firstName} {d.lastName}
              </span>
              <span className="block text-xs text-muted">
                {names[d.specialty.slug] ?? d.specialty.slug} {d.active ? "" : "· masqué"}
              </span>
            </span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
        ))}
      </div>
      <Card className="mt-8">
        <h2 className="mb-5 font-display text-lg font-semibold">Ajouter un médecin</h2>
        <ActionForm action={createDoctor} submit="Créer la fiche">
          <DoctorFields specialties={specialties} />
        </ActionForm>
      </Card>
    </>
  );
}
