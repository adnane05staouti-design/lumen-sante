import Image from "next/image";

/** Clinic logo: the uploaded image if there is one, otherwise the default gradient mark. */
export function LogoMark({ logo, size = 28, className = "" }: { logo: string | null; size?: number; className?: string }) {
  if (logo) {
    return (
      <Image
        src={`/media/${logo}`}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-lg object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 rounded-lg ${className}`}
      style={{ width: size, height: size, background: "conic-gradient(from 200deg, var(--accent), var(--accent-2), var(--accent))" }}
    />
  );
}
