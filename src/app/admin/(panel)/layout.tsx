import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { logout } from "@/app/actions/admin";
import { getSite } from "@/lib/content";
import { LogoMark } from "@/components/ui/Logo";
import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/admin/Sidebar";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const [user, { identity }] = await Promise.all([requireUser(), getSite()]);
  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-line bg-bg-2/60 p-4 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0 lg:p-5">
        <Link href="/admin" className="mb-6 hidden items-center gap-2.5 px-2 font-display font-semibold lg:flex">
          <LogoMark logo={identity.logo} size={24} />
          {identity.name}
        </Link>
        <Sidebar isAdmin={user.role === "ADMIN"} />
        <div className="mt-6 hidden border-t border-line pt-5 lg:block">
          <p className="px-2 text-sm font-medium">{user.name}</p>
          <p className="px-2 text-xs text-muted">{user.role === "ADMIN" ? "Administrateur" : "Secrétariat"}</p>
          <Link href="/fr" target="_blank" className="mt-4 flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted hover:text-fg">
            <ExternalLink size={15} /> Voir le site
          </Link>
          <form action={logout}>
            <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted hover:text-fg">
              <LogOut size={15} /> Déconnexion
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 p-5 md:p-10">{children}</main>
    </div>
  );
}
