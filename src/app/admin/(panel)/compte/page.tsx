import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { changeOwnPassword, logout } from "@/app/actions/admin";
import { confirmMfaSetup, disableMfa, regenerateRecoveryCodes, startMfaSetup } from "@/app/actions/mfa";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getSite } from "@/lib/content";
import { decryptSecret, otpauthUri } from "@/lib/totp";
import { ActionForm, Field, inputCls } from "@/components/admin/ActionForm";
import { ConfirmMfaForm, DisableMfaForm, RegenerateCodesForm } from "@/components/admin/MfaForms";
import { Card, PageTitle } from "@/components/admin/ui";

/** Every staff member manages their own password here. */
export default async function AccountPage() {
  const me = await requireUser();
  const [user, site] = await Promise.all([db.query.users.findFirst({ where: eq(schema.users.id, me.id) }), getSite()]);
  // set-up in progress: secret generated but not confirmed yet → QR code for the phone app
  const pending = user && !user.totpEnabled && user.totpSecret ? decryptSecret(user.totpSecret) : null;
  const qr = pending ? await QRCode.toDataURL(otpauthUri(pending, me.email, site.identity.name), { margin: 1, width: 200 }) : null;
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
        <h2 className="flex items-center gap-3 font-display text-lg font-semibold">
          Double authentification
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${me.mfa ? "bg-accent/15 text-accent" : "bg-amber-300/15 text-amber-200"}`}>
            {me.mfa ? "Activée" : "Désactivée"}
          </span>
        </h2>
        {me.mfa ? (
          <>
            <p className="mt-1 text-sm text-muted">
              À chaque connexion, un code à 6 chiffres de votre application est demandé en plus du mot de passe.
              Codes de secours restants : <strong className="text-fg">{user?.recoveryCodes.length ?? 0}</strong>.
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted hover:text-fg">Nouveaux codes de secours</summary>
              <RegenerateCodesForm action={regenerateRecoveryCodes} />
            </details>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-muted hover:text-fg">Désactiver la double authentification</summary>
              <DisableMfaForm action={disableMfa} />
            </details>
          </>
        ) : pending && qr ? (
          <>
            <ol className="mt-3 list-decimal space-y-1 ps-5 text-sm text-muted">
              <li>Installez Google Authenticator, Microsoft Authenticator ou 1Password sur votre téléphone.</li>
              <li>Scannez ce QR code avec l&apos;application (ou saisissez la clé à la main).</li>
              <li>Entrez le code à 6 chiffres affiché pour confirmer.</li>
            </ol>
            <div className="mt-4 flex flex-wrap items-center gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URL generated on the server */}
              <img src={qr} alt="QR code à scanner avec l'application d'authentification" width={160} height={160} className="rounded-lg bg-white p-2" />
              <div className="min-w-0">
                <p className="text-xs text-muted">Clé à saisir à la main</p>
                <p className="mt-1 break-all font-mono text-sm" dir="ltr">
                  {pending.match(/.{1,4}/g)?.join(" ")}
                </p>
              </div>
            </div>
            <ConfirmMfaForm action={confirmMfaSetup} />
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Protège l&apos;accès aux données des patients même si votre mot de passe est volé : un code à 6 chiffres, généré par une
              application sur votre téléphone, est demandé à chaque connexion.
            </p>
            <form action={startMfaSetup} className="mt-4">
              <button className="rounded-lg bg-fg px-4 py-2.5 text-sm font-semibold text-bg">Activer la double authentification</button>
            </form>
          </>
        )}
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
