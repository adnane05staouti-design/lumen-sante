import { notFound } from "next/navigation";

/** Any unknown address under /fr, /en, /ar shows the branded 404 page. */
export default function CatchAll() {
  notFound();
}
