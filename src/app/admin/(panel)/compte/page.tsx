import { changeOwnPassword, logout } from "@/app/actions/admin";
import { requireUser } from "@/lib/auth";
import { ActionForm, Field, inputCls } from "@/components/admin/ActionForm";
import { Card, PageTitle } from "@/components/admin/ui";

/** Every staff member manages their own password here. */
export default async function AccountPage() {
  const me = await requireUser();
  return (
    <>
      <PageTitle title="Mon compte" lead={`${me.name} · ${me.email}`} />
      <Card className="max-w-xl">
        <h2 className="font-display text-lg font-semibold">Changer mon mot de passe</h2>
        <p className="mt-1 text-sm text-muted">12 caractères minimum. Vos autres appareils seront déconnectés.</p>
        <ActionForm action={changeOwnPassword} submit="Changer le mot de passe" success="Mot de passe changé." className="mt-5 space-y-4">
          <Field label="Mot de passe actuel">
            <input name="current" type="password" required autoComplete="current-password" className={inputCls} />
          </Field>
          <Field label="Nouveau mot de passe">
            <input name="next" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className={inputCls} />
          </Field>
          <Field label="Confirmer le nouveau mot de passe">
            <input name="confirm" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className={inputCls} />
          </Field>
        </ActionForm>
      </Card>
      <Card className="mt-6 max-w-xl">
        <h2 className="font-display text-lg font-semibold">Sécurité</h2>
        <p className="mt-1 text-sm text-muted">Appareil perdu ou partagé ? Déconnectez toutes vos sessions, sur tous les appareils.</p>
        <form action={logout} className="mt-4">
          <button className="rounded-lg border border-line px-4 py-2.5 text-sm hover:bg-surface-2">Me déconnecter partout</button>
        </form>
      </Card>
    </>
  );
}
