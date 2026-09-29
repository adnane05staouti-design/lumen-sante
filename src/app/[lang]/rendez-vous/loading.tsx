/** Instant placeholder while the booking page computes the available days. */
export default function Loading() {
  return (
    <div aria-busy="true" className="container-x animate-pulse pt-32 pb-20">
      <div className="h-4 w-32 rounded bg-surface-2" />
      <div className="mt-5 h-12 w-[min(520px,90%)] rounded-xl bg-surface-2" />
      <div className="mt-4 h-5 w-[min(420px,80%)] rounded bg-surface" />
      <div className="mt-12 h-[420px] max-w-3xl rounded-3xl border border-line bg-surface" />
    </div>
  );
}
