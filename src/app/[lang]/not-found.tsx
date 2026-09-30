import { getSite, getTexts } from "@/lib/content";
import { NotFoundView } from "./NotFoundView";

/** Branded 404 in the visitor's language (texts editable in /admin/contenu). */
export default async function NotFound() {
  const [fr, en, ar, site] = await Promise.all([getTexts("fr"), getTexts("en"), getTexts("ar"), getSite()]);
  return <NotFoundView texts={{ fr: fr.notFound, en: en.notFound, ar: ar.notFound }} siteName={site.identity.name} />;
}
