import { Fragment, type ElementType } from "react";

/**
 * Heading whose words slide up from behind a mask when it scrolls into view.
 * Words (not letters) are animated so Arabic letters stay joined.
 * The text is in the HTML from the start: search engines and screen readers read it normally.
 * No JavaScript per instance: the shared <InView /> observer adds the "is-in" class.
 */
export function TextReveal({
  text,
  as: Tag = "h2",
  className,
  gradientWords = [],
  delay = 0,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  /** indexes of words painted with the accent gradient */
  gradientWords?: number[];
  delay?: number;
}) {
  const words = text.split(" ");
  return (
    <Tag data-inview className={`reveal-words ${className ?? ""}`} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span aria-hidden="true" className="rw-mask">
            <span
              className={`rw-word ${gradientWords.includes(i) ? "text-gradient" : ""}`}
              style={{ transitionDelay: `${delay + i * 0.06}s` }}
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
}
