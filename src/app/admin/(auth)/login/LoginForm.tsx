"use client";

import { useActionState } from "react";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { login } from "@/app/actions/admin";
import { cancelLoginCode, verifyLoginCode } from "@/app/actions/mfa";
import { inputCls } from "@/components/admin/ActionForm";

/** Step 1: e-mail + password. Step 2 (accounts with 2FA): 6-digit code or recovery code. */
export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const [codeState, codeAction, codePending] = useActionState(verifyLoginCode, undefined);

  if (state?.mfa) {
    return (
      <div className="mt-8">
        <form action={codeAction} className="space-y-4">
          <label className="block">
            <span className="text-xs text-muted">Code à 6 chiffres de votre application d&apos;authentification</span>
            <input
              name="code"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={20}
              placeholder="123 456"
              dir="ltr"
              className={`${inputCls} text-center font-display text-xl tracking-[0.3em]`}
            />
          </label>
          <p className="text-xs text-subtle">Téléphone perdu ? Saisissez un de vos codes de secours (ex. abcd-efgh).</p>
          {codeState?.error && (
            <p role="alert" className="text-sm text-red-300">
              {codeState.error}
            </p>
          )}
          <button
            disabled={codePending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-fg py-3 font-semibold text-bg disabled:opacity-60"
          >
            {codePending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Vérifier
          </button>
        </form>
        <form action={cancelLoginCode} className="mt-3 text-center">
          <button className="text-xs text-muted underline-offset-4 hover:underline">Retour</button>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-xs text-muted">E-mail</span>
        <input name="email" type="email" autoComplete="username" required className={inputCls} />
      </label>
      <label className="block">
        <span className="text-xs text-muted">Mot de passe</span>
        <input name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-fg py-3 font-semibold text-bg disabled:opacity-60"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />} Se connecter
      </button>
    </form>
  );
}
