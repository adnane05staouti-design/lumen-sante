import { Field, inputCls } from "./ActionForm";

type Doctor = {
  title: string;
  firstName: string;
  lastName: string;
  specialtyId: string;
  languages: string;
  bioFr: string;
  bioEn: string;
  bioAr: string;
  active: boolean;
};

export function DoctorFields({ doctor, specialties }: { doctor?: Doctor; specialties: { id: string; slug: string; name?: string }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid grid-cols-[90px_1fr] gap-3">
        <Field label="Titre">
          <input name="title" defaultValue={doctor?.title ?? "Dr"} required maxLength={10} className={inputCls} />
        </Field>
        <Field label="Prénom">
          <input name="firstName" defaultValue={doctor?.firstName} required maxLength={60} className={inputCls} />
        </Field>
      </div>
      <Field label="Nom">
        <input name="lastName" defaultValue={doctor?.lastName} required maxLength={60} className={inputCls} />
      </Field>
      <Field label="Spécialité">
        <select name="specialtyId" defaultValue={doctor?.specialtyId} required className={inputCls}>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ?? s.slug}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Langues parlées (codes séparés par des virgules : fr,ar,en)">
        <input name="languages" defaultValue={doctor?.languages ?? "fr,ar"} maxLength={40} className={inputCls} />
      </Field>
      <Field label="Présentation (français)">
        <textarea name="bioFr" defaultValue={doctor?.bioFr} rows={3} maxLength={600} className={inputCls} />
      </Field>
      <Field label="Présentation (anglais)">
        <textarea name="bioEn" defaultValue={doctor?.bioEn} rows={3} maxLength={600} className={inputCls} />
      </Field>
      <Field label="Présentation (arabe)">
        <textarea name="bioAr" dir="rtl" defaultValue={doctor?.bioAr} rows={3} maxLength={600} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={doctor?.active ?? true} className="size-4 accent-[var(--accent)]" />
        Visible sur le site et réservable
      </label>
    </div>
  );
}
