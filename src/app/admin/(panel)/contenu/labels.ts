/**
 * Friendly labels for the text editor (/admin/contenu).
 * Key = path inside a dictionary section ("hero.title1"); list items use "*" ("process.steps.*.t").
 */
export const LABELS: Record<string, string> = {
  // SEO
  "meta.title": "Titre de la page (Google, onglet du navigateur)",
  "meta.description": "Description (résultats Google)",
  // navigation
  "nav.specialties": "Menu : Spécialités",
  "nav.center": "Menu : Le centre",
  "nav.doctors": "Menu : Médecins",
  "nav.contact": "Menu : Contact",
  "nav.book": "Bouton du menu",
  "nav.skip": "Lien « Aller au contenu » (clavier, lecteurs d'écran)",
  // hero
  "hero.badge": "Pastille au-dessus du titre",
  "hero.title1": "Titre — début",
  "hero.highlight": "Titre — mot en couleur",
  "hero.title2": "Titre — fin",
  "hero.lead": "Texte d'introduction",
  "hero.cta": "Bouton principal",
  "hero.cta2": "Bouton secondaire",
  "hero.fast": "Texte sous « < 60 s »",
  // widget
  "booking.title": "Widget : titre",
  "booking.step": "Widget : mot « Étape »",
  "booking.specialty": "Widget : libellé Spécialité",
  "booking.date": "Widget : libellé Date",
  "booking.next": "Widget : bouton",
  "booking.days": "Jours de la semaine (dimanche → samedi)",
  "booking.nextSlot": "Widget : « Prochain créneau »",
  "booking.today": "Mot « aujourd'hui »",
  "booking.tomorrow": "Mot « demain »",
  "booking.noSlot": "Widget : aucun créneau",
  "booking.live": "Widget : « Disponibilités en direct »",
  "booking.taken": "Heure déjà réservée (bulle d'aide)",
  "booking.full": "Jour complet",
  // effects / home
  "fx.marquee": "Bandeau défilant (une phrase par ligne)",
  "fx.scroll": "Indication « Faites défiler »",
  "fx.services": "Mot « Prestations »",
  "fx.duration": "Mot « Durée »",
  "fx.bookIn": "Bouton des spécialités (début)",
  "fx.statsEyebrow": "Titre de la section chiffres",
  "fx.galleryEyebrow": "Galerie : sur-titre",
  "fx.galleryTitle": "Galerie : titre",
  "fx.galleryLead": "Galerie : texte",
  "fx.visit": "Galerie : indication de visite",
  "fx.call": "Bouton « Appeler le cabinet »",
  "fx.hint": "Astuce sur les particules",
  // specialties section
  "specialties.eyebrow": "Sur-titre",
  "specialties.title": "Titre",
  "specialties.lead": "Texte",
  "specialties.book": "Bouton « Réserver »",
  "specialties.minutes": "Unité « min »",
  // process
  "process.eyebrow": "Sur-titre",
  "process.title": "Titre",
  "process.steps.*.t": "Titre de l'étape",
  "process.steps.*.d": "Description de l'étape",
  // center
  "center.eyebrow": "Sur-titre (ancien)",
  "center.title": "Titre (ancien)",
  "center.items.*.t": "Atout : titre",
  "center.items.*.d": "Atout : description",
  "center.stats.*.v": "Chiffre (ancien)",
  "center.stats.*.l": "Libellé (ancien)",
  // cta
  "cta.title": "Titre",
  "cta.lead": "Texte",
  "cta.button": "Bouton",
  // footer
  "footer.hours": "Titre « Horaires »",
  "footer.weekdays": "Libellé semaine",
  "footer.saturday": "Libellé samedi",
  "footer.contact": "Titre « Contact »",
  "footer.rights": "Mention « Tous droits réservés »",
  "footer.demo": "Mention de bas de page",
};

export const label = (path: string) => LABELS[path.replace(/\.\d+\./g, ".*.")] ?? path.split(".").slice(1).join(" › ");

/** Tabs of the content editor. "texts" = dictionary sections edited with the generic form. */
export const TABS = [
  { id: "identite", label: "Identité & logo", texts: [] as string[] },
  { id: "accueil", label: "Accueil", texts: ["hero", "fx", "booking"] },
  { id: "specialites", label: "Spécialités", texts: ["specialties"] },
  { id: "centre", label: "Le centre & photos", texts: ["center"] },
  { id: "chiffres", label: "Chiffres", texts: [] },
  { id: "parcours", label: "Étapes", texts: ["process"] },
  { id: "appel", label: "Appel à l'action", texts: ["cta"] },
  { id: "menu", label: "Menu & pied de page", texts: ["nav", "footer"] },
  { id: "seo", label: "Référencement", texts: ["meta"] },
  { id: "pages", label: "Autres pages & e-mails", texts: ["doctorsPage", "book", "cancelPage", "email", "privacy", "notFound"] },
] as const;

export const SECTION_TITLE: Record<string, string> = {
  hero: "Haut de page",
  fx: "Éléments de l'accueil",
  booking: "Widget de réservation",
  specialties: "Section Spécialités",
  center: "Atouts du centre",
  process: "Étapes",
  cta: "Appel à l'action",
  nav: "Menu",
  footer: "Pied de page",
  meta: "Référencement (SEO)",
  doctorsPage: "Page Médecins",
  book: "Page de réservation",
  cancelPage: "Page d'annulation",
  email: "E-mail de confirmation",
  privacy: "Page Confidentialité (loi 09-08)",
  notFound: "Page introuvable (404)",
};
