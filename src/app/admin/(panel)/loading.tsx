/** Shown instantly while an admin page loads its data (the sidebar stays in place). */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Chargement…</span>
      <div className="h-8 w-56 rounded-lg bg-surface-2" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-surface" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-line bg-surface" />
        ))}
      </div>
      <div className="mt-6 space-y-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-xl border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}
