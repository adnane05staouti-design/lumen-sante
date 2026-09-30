"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/app/actions/admin";

/** Form bound to a server action, with pending state and success / error message. */
export function ActionForm({
  action,
  children,
  submit,
  className = "",
  success = "Enregistré.",
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  submit: string;
  className?: string;
  success?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  // after an error the fields keep what was typed (React would otherwise empty the form); after a success they are reset
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {children}
      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-fg px-4 py-2.5 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {pending && <Loader2 size={15} className="animate-spin" />}
          {submit}
        </button>
        {state?.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
        {state?.ok && <p className="text-sm text-accent">{success}</p>}
      </div>
    </form>
  );
}

export const inputCls =
  "mt-1.5 block w-full rounded-lg border border-line bg-bg-2 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
