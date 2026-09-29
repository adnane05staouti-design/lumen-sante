import { asc } from "drizzle-orm";
import { updateSpecialty } from "@/app/actions/admin";
import { db, schema } from "@/db";
import { specialtyNames } from "@/lib/content";
import { requireUser } from "@/lib/auth";
import { ActionForm, Field, inputCls } from "@/components/admin/ActionForm";
import { Card, PageTitle } from "@/components/admin/ui";
import { SpecialtyIcon } from "@/components/ui/SpecialtyIcon";
import type { SpecialtyId } from "@/config/clinic";

export default async function SpecialtiesAdmin() {
  await requireUser("ADMIN");
  const [rows, names] = await Promise.all([db.query.specialties.findMany({ orderBy: [asc(schema.specialties.sortOrder)] }), specialtyNames()]);
  return (
    <>
      <PageTitle title="Spécialités" lead="Activez une spécialité et réglez la durée d'un rendez-vous." />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((s) => (
          <Card key={s.id}>
            <p className="flex items-center gap-3 font-display text-lg font-semibold">
              <SpecialtyIcon id={s.slug as SpecialtyId} size={20} className="text-accent" />
              {names[s.slug] ?? s.slug}
            </p>
            <ActionForm action={updateSpecialty.bind(null, s.id)} submit="Enregistrer" className="mt-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-44">
                  <Field label="Durée d'un rendez-vous (min)">
                    <input type="number" name="durationMin" min={10} max={180} step={5} defaultValue={s.durationMin} className={inputCls} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 pb-2.5 text-sm">
                  <input type="checkbox" name="active" defaultChecked={s.active} className="size-4 accent-[var(--accent)]" /> Visible et réservable
                </label>
              </div>
            </ActionForm>
          </Card>
        ))}
      </div>
    </>
  );
}
