import type { ReactNode } from "react";

export function PageTitle({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {lead && <p className="mt-1 text-muted">{lead}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-6 ${className}`}>{children}</section>;
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  CANCELLED: "Annulé",
  COMPLETED: "Terminé",
  NO_SHOW: "Absent",
};

const STATUS_CLS: Record<string, string> = {
  PENDING: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  CONFIRMED: "border-accent/30 bg-accent/10 text-accent",
  CANCELLED: "border-red-400/30 bg-red-400/10 text-red-300",
  COMPLETED: "border-line-strong bg-surface-2 text-muted",
  NO_SHOW: "border-orange-400/30 bg-orange-400/10 text-orange-300",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${STATUS_CLS[status]}`}>{STATUS_LABEL[status]}</span>;
}
