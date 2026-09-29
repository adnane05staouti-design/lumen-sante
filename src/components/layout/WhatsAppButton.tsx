/** Floating WhatsApp button (number editable in /admin/contenu → Identité). Hidden when no number is set. */
export function WhatsAppButton({ number, label }: { number: string; label: string }) {
  const digits = number.replace(/[^\d]/g, "");
  if (digits.length < 8 || /^2126?0{6,}/.test(digits)) return null; // no number, or the demo placeholder
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed right-5 bottom-5 z-40 grid size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,.7)] transition-transform hover:scale-105 rtl:right-auto rtl:left-5"
    >
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.86 9.86 0 0 0 12.04 2Zm5.8 14.13c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.26-.68-2.76-1.09-4.5-3.91-4.64-4.09-.13-.18-1.11-1.48-1.11-2.82s.7-2 .96-2.27a1 1 0 0 1 .72-.34h.52c.17 0 .39-.06.61.47.24.56.8 1.94.87 2.08.07.14.12.3.02.48-.09.18-.14.3-.28.46l-.41.49c-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.07.95 1.97 1.24 2.25 1.38.28.14.44.12.6-.07.17-.19.7-.81.88-1.09.18-.28.37-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.17 1.33Z" />
      </svg>
    </a>
  );
}
