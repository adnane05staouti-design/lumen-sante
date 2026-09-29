"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown if a page crashes: the visitor can retry, and no technical detail is displayed. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page error]", error.digest ?? "");
  }, [error]);
  return (
    <main id="contenu" className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <h1 className="font-display text-3xl font-semibold">Une erreur est survenue · Something went wrong · حدث خطأ</h1>
        <p className="mt-3 text-muted">Merci de réessayer dans un instant. · Please try again. · يرجى إعادة المحاولة.</p>
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-xl bg-fg px-6 py-3 font-semibold text-bg">
            Réessayer · Retry · إعادة
          </button>
          <Link href="/" className="rounded-xl border border-line px-6 py-3">
            Accueil · Home · الرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
