import { redirect } from "next/navigation";
import { getSite } from "@/lib/content";
import { LogoMark } from "@/components/ui/Logo";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  const { identity } = await getSite();
  return (
    <main className="relative isolate grid min-h-screen place-items-center px-5">
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(50%_50%_at_50%_50%,black,transparent)]" />
      <div className="glass w-full max-w-sm rounded-3xl p-8">
        <p className="flex items-center gap-2.5 font-display text-lg font-semibold">
          <LogoMark logo={identity.logo} size={28} />
          {identity.name}
        </p>
        <h1 className="mt-8 font-display text-2xl font-semibold">Espace cabinet</h1>
        <p className="mt-1 text-sm text-muted">Connexion réservée au personnel.</p>
        <LoginForm />
      </div>
    </main>
  );
}
