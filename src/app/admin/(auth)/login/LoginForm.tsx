"use client";

import { useActionState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { login } from "@/app/actions/admin";
import { inputCls } from "@/components/admin/ActionForm";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
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
      {state?.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
      <button
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-fg py-3 font-semibold text-bg disabled:opacity-60"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />} Se connecter
      </button>
    </form>
  );
}
