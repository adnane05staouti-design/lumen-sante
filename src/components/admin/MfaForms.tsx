"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import type { FormState } from "@/app/actions/admin";
import { inputCls } from "./ActionForm";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** Recovery codes, shown only once: to copy and keep somewhere safe (password manager, paper). */
function RecoveryCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
      <p className="text-sm font-semibold text-amber-100">Codes de secours — affichés une seule fois</p>
      <p className="mt-1 text-xs text-amber-100/80">
        Gardez-les en lieu sûr. Chacun permet une connexion si vous perdez votre téléphone, puis ne fonctionne plus.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm" dir="ltr">
        {codes.map((c) => (
          <li key={c} className="rounded-md bg-bg-2 px-3 py-1.5 text-center">
            {c}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(codes.join("\n")).then(() => setCopied(true))}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs hover:bg-surface-2"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copiés" : "Copier les codes"}
      </button>
    </div>
  );
}

function CodeInput() {
  return (
    <input
      name="code"
      required
      autoComplete="one-time-code"
      inputMode="numeric"
      maxLength={20}
      placeholder="123 456"
      dir="ltr"
      aria-label="Code à 6 chiffres"
      className={`${inputCls} max-w-[180px] text-center font-display tracking-[0.25em]`}
    />
  );
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-fg px-4 py-2.5 text-sm font-semibold text-bg disabled:opacity-60">
      {pending && <Loader2 size={15} className="animate-spin" />} {label}
    </button>
  );
}

/** Confirms the set-up with the first code, then shows the recovery codes. */
export function ConfirmMfaForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  if (state?.codes) {
    return (
      <>
        <p className="mt-4 flex items-center gap-2 text-sm text-accent">
          <Check size={16} /> Double authentification activée.
        </p>
        <RecoveryCodes codes={state.codes} />
        <Link href="/admin/compte" className="mt-4 inline-block text-sm text-muted underline underline-offset-4">
          J&apos;ai enregistré mes codes
        </Link>
      </>
    );
  }
  return (
    <form action={formAction} className="mt-5 flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="text-xs text-muted">Code affiché par l&apos;application</span>
        <CodeInput />
      </label>
      <Submit pending={pending} label="Activer" />
      {state?.error && (
        <p role="alert" className="w-full text-sm text-red-300">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** New recovery codes (requires a current 6-digit code). */
export function RegenerateCodesForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  if (state?.codes) return <RecoveryCodes codes={state.codes} />;
  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
      <CodeInput />
      <Submit pending={pending} label="Générer de nouveaux codes" />
      {state?.error && (
        <p role="alert" className="w-full text-sm text-red-300">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Turning 2FA off: password + current code. */
export function DisableMfaForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="Mot de passe"
        aria-label="Mot de passe"
        className={`${inputCls} max-w-[220px]`}
      />
      <CodeInput />
      <Submit pending={pending} label="Désactiver" />
      {state?.error && (
        <p role="alert" className="w-full text-sm text-red-300">
          {state.error}
        </p>
      )}
    </form>
  );
}
