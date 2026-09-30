import { desc } from "drizzle-orm";
import { anonymizeOldAppointments, createUser, resetUserPassword, toggleUser, updateSettings } from "@/app/actions/admin";
import { resetUserMfa } from "@/app/actions/mfa";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getRules } from "@/lib/slots";
import { clinicDay, clinicTime } from "@/lib/time";
import { ActionForm, Field, inputCls } from "@/components/admin/ActionForm";
import { Card, PageTitle } from "@/components/admin/ui";

/** Readable labels for the activity log (codes stay technical in the database). */
const ACTION_LABEL: Record<string, string> = {
  "login.success": "Connexion",
  "login.failed": "Échec de connexion",
  "appointment.status": "Statut de rendez-vous",
  "doctor.create": "Médecin ajouté",
  "doctor.update": "Fiche médecin modifiée",
  "doctor.schedule": "Horaires modifiés",
  "doctor.absence.add": "Absence ajoutée",
  "doctor.absence.delete": "Absence supprimée",
  "specialty.update": "Spécialité modifiée",
  "settings.update": "Règles modifiées",
  "user.create": "Compte créé",
  "user.disable": "Compte désactivé",
  "user.enable": "Compte réactivé",
  "user.password": "Mot de passe changé",
  "user.password.reset": "Mot de passe réinitialisé",
  "login.mfa.failed": "Code 2FA refusé",
  "user.mfa.enabled": "Double authentification activée",
  "user.mfa.disabled": "Double authentification désactivée",
  "user.mfa.codes": "Nouveaux codes de secours",
  "user.mfa.reset": "Double authentification réinitialisée",
  "data.anonymize": "Anonymisation des données",
  "content.texts": "Textes modifiés",
  "content.identity": "Identité modifiée",
  "content.specialties": "Spécialités modifiées",
  "content.stats": "Chiffres modifiés",
  "content.gallery.add": "Photo ajoutée",
  "content.gallery.captions": "Légendes modifiées",
  "content.gallery.move": "Photo déplacée",
  "content.gallery.delete": "Photo supprimée",
  "content.reset": "Contenu rétabli",
};

export default async function SettingsAdmin() {
  const me = await requireUser("ADMIN");
  const [rules, users, logs] = await Promise.all([
    getRules(),
    db.query.users.findMany({
      columns: { id: true, name: true, email: true, role: true, active: true, totpEnabled: true },
      orderBy: [desc(schema.users.createdAt)],
    }),
    db.query.auditLogs.findMany({ with: { user: true }, orderBy: [desc(schema.auditLogs.createdAt)], limit: 40 }),
  ]);

  return (
    <>
      <PageTitle title="Paramètres" lead="Règles de réservation, comptes et journal d'activité." />

      <Card>
        <h2 className="font-display text-lg font-semibold">Règles de réservation</h2>
        <ActionForm action={updateSettings} submit="Enregistrer les règles" className="mt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Délai minimum avant un RDV (heures)">
              <input type="number" name="minLeadHours" min={0} max={168} defaultValue={rules.minLeadHours} className={inputCls} />
            </Field>
            <Field label="Réservation jusqu'à (jours)">
              <input type="number" name="maxDaysAhead" min={1} max={365} defaultValue={rules.maxDaysAhead} className={inputCls} />
            </Field>
            <Field label="Annulation en ligne jusqu'à (heures avant)">
              <input type="number" name="cancelLimitHours" min={0} max={168} defaultValue={rules.cancelLimitHours} className={inputCls} />
            </Field>
            <Field label="RDV à venir max. par patient">
              <input type="number" name="maxActivePerEmail" min={1} max={20} defaultValue={rules.maxActivePerEmail} className={inputCls} />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" name="autoConfirm" defaultChecked={rules.autoConfirm} className="size-4 accent-[var(--accent)]" />
            Confirmer automatiquement les rendez-vous (sinon : validation par le cabinet)
          </label>
        </ActionForm>
      </Card>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold">Comptes du personnel</h2>
        <ul className="mt-4 divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span>
                {u.name} <span className="text-muted">· {u.email}</span>
                <span className="block text-xs text-muted">
                  {u.role === "ADMIN" ? "Administrateur" : "Secrétariat"} {u.active ? "" : "· désactivé"}{" "}
                  · {u.totpEnabled ? <span className="text-accent">2FA activée</span> : <span className="text-amber-200">sans 2FA</span>}
                </span>
              </span>
              {u.id !== me.id && (
                <div className="flex flex-wrap items-center gap-2">
                  <details className="group">
                    <summary className="cursor-pointer list-none rounded-md border border-line px-3 py-1.5 text-xs hover:bg-surface-2">Nouveau mot de passe</summary>
                    <ActionForm action={resetUserPassword.bind(null, u.id)} submit="Définir" success="Mot de passe changé, sessions fermées." className="mt-2 w-72">
                      <input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" placeholder="12 caractères minimum" className={inputCls} />
                    </ActionForm>
                  </details>
                  {u.totpEnabled && (
                    <form action={resetUserMfa.bind(null, u.id)}>
                      <ConfirmButton
                        message={`Retirer la double authentification de ${u.name} (téléphone perdu) ? Ses sessions seront fermées ; il pourra la réactiver depuis « Mon compte ».`}
                        className="rounded-md border border-line px-3 py-1.5 text-xs hover:bg-surface-2"
                      >
                        Réinitialiser la 2FA
                      </ConfirmButton>
                    </form>
                  )}
                  <form action={toggleUser.bind(null, u.id)}>
                    <button className="rounded-md border border-line px-3 py-1.5 text-xs hover:bg-surface-2">{u.active ? "Désactiver" : "Réactiver"}</button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
        <ActionForm action={createUser} submit="Créer le compte" success="Compte créé." className="mt-6 border-t border-line pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Nom">
              <input name="name" required maxLength={80} className={inputCls} />
            </Field>
            <Field label="E-mail">
              <input name="email" type="email" required className={inputCls} />
            </Field>
            <Field label="Mot de passe (12 caractères min.)">
              <input name="password" type="password" required minLength={12} autoComplete="new-password" className={inputCls} />
            </Field>
            <Field label="Rôle">
              <select name="role" className={inputCls}>
                <option value="STAFF">Secrétariat (rendez-vous)</option>
                <option value="ADMIN">Administrateur (tout)</option>
              </select>
            </Field>
          </div>
        </ActionForm>
      </Card>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold">Protection des données (loi 09-08)</h2>
        <p className="mt-1 text-sm text-muted">
          Efface l&apos;identité des patients (nom, téléphone, e-mail, motif) des rendez-vous passés depuis plus de N mois. Les statistiques
          restent. Action irréversible.
        </p>
        <ActionForm action={anonymizeOldAppointments} submit="Anonymiser" success="Anonymisation effectuée (voir le journal)." className="mt-4">
          <Field label="Rendez-vous terminés depuis plus de (mois)">
            <input name="months" type="number" min={6} max={120} defaultValue={24} className={inputCls + " max-w-40"} />
          </Field>
        </ActionForm>
      </Card>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold">Journal d&apos;activité</h2>
        <ul className="mt-4 space-y-1.5 font-mono text-xs">
          {logs.map((l) => (
            <li key={l.id} className="flex flex-wrap gap-x-3 text-muted">
              <span className="text-subtle">
                {clinicDay(l.createdAt)} {clinicTime(l.createdAt)}
              </span>
              <span className="text-fg">{ACTION_LABEL[l.action] ?? l.action}</span>
              <span>{l.user?.email ?? "—"}</span>
              <span className="truncate">{l.detail}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
