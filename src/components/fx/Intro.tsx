/**
 * Opening curtain: the clinic name rises letter by letter, a light line runs, then the curtain lifts.
 * Pure CSS (no JavaScript to wait for), shown once per browser session on large screens,
 * skipped on phones (instant content) and with "reduce motion". The inline script runs before the first paint.
 */
export function Intro({ name }: { name: string }) {
  const letters = [...name];
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(sessionStorage.getItem('lumen-intro')||!matchMedia('(min-width: 1024px)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('no-intro')}else{sessionStorage.setItem('lumen-intro','1')}}catch(e){document.documentElement.classList.add('no-intro')}",
        }}
      />
      <div aria-hidden="true" className="intro">
        <p className="intro-word font-display" dir="ltr">
          {letters.map((l, i) => (
            <span key={i} style={{ animationDelay: `${0.05 + i * 0.045}s` }}>
              {l === " " ? " " : l}
            </span>
          ))}
        </p>
        <span className="intro-line" />
      </div>
    </>
  );
}
