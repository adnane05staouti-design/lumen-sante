/**
 * ONE file to adapt the site to a new client.
 * Change the name, contact details, colors and the list of specialties:
 * the whole site (pages, booking, admin) follows.
 */
export type SpecialtyId =
  | "dentaire"
  | "ophtalmologie"
  | "psychiatrie"
  | "dermatologie"
  | "pediatrie"
  | "cardiologie";

export const clinic = {
  name: "Lumen Santé",
  /** single = one specialty practice, multi = medical center */
  mode: "multi" as "single" | "multi",
  city: { fr: "Casablanca", en: "Casablanca", ar: "الدار البيضاء" },
  address: { fr: "Bd d'Anfa, Casablanca", en: "Bd d'Anfa, Casablanca", ar: "شارع أنفا، الدار البيضاء" },
  phone: "+212 5 00 00 00 00",
  whatsapp: "+212 6 00 00 00 00",
  email: "contact@lumen-sante.example",
  hours: { weekdays: "09:00 – 18:00", saturday: "09:00 – 13:00" },
  /** IANA time zone of the clinic: every slot is computed in this zone (handles Morocco's Ramadan time change). */
  timezone: "Africa/Casablanca",
  theme: { accent: "#5eead4", accent2: "#8b7cff" },
  /** Enabled specialties, in display order. Remove a line to hide a specialty everywhere. */
  specialties: ["dentaire", "ophtalmologie", "psychiatrie", "dermatologie", "pediatrie", "cardiologie"] as SpecialtyId[],
  /**
   * Key figures shown on the home page. "live" figures are counted in the database
   * (active doctors / specialties); the others are fixed values to adapt per client.
   */
  stats: [
    { live: "doctors", value: 0, prefix: "", suffix: "", label: { fr: "médecins", en: "doctors", ar: "أطباء" } },
    { live: "specialties", value: 0, prefix: "", suffix: "", label: { fr: "spécialités", en: "specialties", ar: "تخصصات" } },
    { live: null, value: 60, prefix: "< ", suffix: " s", label: { fr: "pour réserver", en: "to book", ar: "للحجز" } },
    { live: null, value: 3, prefix: "", suffix: "", label: { fr: "langues d'accueil", en: "languages spoken", ar: "لغات للاستقبال" } },
  ],
  /**
   * Photos (in /public/images). Specialty photos: /images/specialites/<id>.jpg
   * Gallery of the center, in order:
   */
  gallery: [
    { src: "/images/centre/accueil.jpg", caption: { fr: "Accueil", en: "Reception", ar: "الاستقبال" } },
    { src: "/images/centre/attente.jpg", caption: { fr: "Salle d'attente", en: "Waiting room", ar: "قاعة الانتظار" } },
    { src: "/images/centre/consultation.jpg", caption: { fr: "Consultation", en: "Consultation", ar: "الاستشارة" } },
    { src: "/images/centre/equipement.jpg", caption: { fr: "Plateau technique", en: "Equipment", ar: "التجهيزات" } },
    { src: "/images/centre/equipe.jpg", caption: { fr: "L'équipe", en: "The team", ar: "الفريق" } },
  ],
};
