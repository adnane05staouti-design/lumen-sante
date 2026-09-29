import type { ReactNode } from "react";

/**
 * Fades and lifts its children into view when they enter the viewport.
 * No JavaScript per instance: one shared observer (<InView />) adds the "is-in" class.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div data-inview className={`reveal ${className ?? ""}`} style={delay ? { transitionDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}
