"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleUserRound, LayoutDashboard, PenLine, Settings, Stethoscope, UsersRound } from "lucide-react";

const items = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, admin: false },
  { href: "/admin/rendez-vous", label: "Rendez-vous", icon: CalendarDays, admin: false },
  { href: "/admin/medecins", label: "Médecins", icon: UsersRound, admin: true },
  { href: "/admin/specialites", label: "Spécialités", icon: Stethoscope, admin: true },
  { href: "/admin/contenu", label: "Contenu du site", icon: PenLine, admin: true },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings, admin: true },
  { href: "/admin/compte", label: "Mon compte", icon: CircleUserRound, admin: false },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {items
        .filter((i) => isAdmin || !i.admin)
        .map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface hover:text-fg"
              }`}
            >
              <Icon size={17} className={active ? "text-accent" : ""} />
              {label}
            </Link>
          );
        })}
    </nav>
  );
}
