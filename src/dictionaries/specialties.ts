import type { SpecialtyId } from "@/config/clinic";
import type { Localized } from "@/lib/i18n";

export type SpecialtyInfo = {
  name: Localized;
  short: Localized;
  services: Localized<string[]>;
  /** default consultation length, in minutes (used by the booking engine) */
  duration: number;
};

/** Content library for every supported specialty. Only those enabled in clinic.ts are shown. */
export const specialtyInfo: Record<SpecialtyId, SpecialtyInfo> = {
  dentaire: {
    name: { fr: "Dentaire", en: "Dentistry", ar: "طب الأسنان" },
    short: {
      fr: "Implants, blanchiment, orthodontie invisible et soins conservateurs.",
      en: "Implants, whitening, clear aligners and restorative care.",
      ar: "زراعة الأسنان، التبييض، التقويم الشفاف والعلاجات التحفظية.",
    },
    services: {
      fr: ["Implantologie", "Blanchiment", "Orthodontie invisible", "Soins et détartrage"],
      en: ["Implants", "Whitening", "Clear aligners", "Check-up & cleaning"],
      ar: ["زراعة الأسنان", "التبييض", "التقويم الشفاف", "الفحص والتنظيف"],
    },
    duration: 30,
  },
  ophtalmologie: {
    name: { fr: "Ophtalmologie", en: "Ophthalmology", ar: "طب العيون" },
    short: {
      fr: "Bilan de la vue, chirurgie réfractive et suivi du glaucome.",
      en: "Eye exams, refractive surgery and glaucoma follow-up.",
      ar: "فحص النظر، جراحة تصحيح البصر ومتابعة الزرق.",
    },
    services: {
      fr: ["Bilan visuel complet", "Chirurgie laser", "Glaucome", "Ophtalmo-pédiatrie"],
      en: ["Full eye exam", "Laser surgery", "Glaucoma", "Pediatric ophthalmology"],
      ar: ["فحص شامل للنظر", "جراحة الليزر", "الزرق", "طب عيون الأطفال"],
    },
    duration: 30,
  },
  psychiatrie: {
    name: { fr: "Psychiatrie", en: "Psychiatry", ar: "الطب النفسي" },
    short: {
      fr: "Consultations en toute confidentialité, en cabinet ou en téléconsultation.",
      en: "Confidential consultations, in person or by video.",
      ar: "استشارات بسرية تامة، حضورياً أو عن بعد.",
    },
    services: {
      fr: ["Première consultation", "Suivi thérapeutique", "Téléconsultation", "Accompagnement familial"],
      en: ["First consultation", "Ongoing therapy", "Video consultation", "Family support"],
      ar: ["الاستشارة الأولى", "المتابعة العلاجية", "الاستشارة عن بعد", "مرافقة الأسرة"],
    },
    duration: 45,
  },
  dermatologie: {
    name: { fr: "Dermatologie", en: "Dermatology", ar: "الأمراض الجلدية" },
    short: {
      fr: "Dermatologie médicale et esthétique, dépistage des grains de beauté.",
      en: "Medical and aesthetic dermatology, mole screening.",
      ar: "طب الجلد العلاجي والتجميلي، فحص الشامات.",
    },
    services: {
      fr: ["Consultation", "Dépistage", "Laser", "Soins esthétiques"],
      en: ["Consultation", "Screening", "Laser", "Aesthetic care"],
      ar: ["استشارة", "الكشف المبكر", "الليزر", "العناية التجميلية"],
    },
    duration: 30,
  },
  pediatrie: {
    name: { fr: "Pédiatrie", en: "Pediatrics", ar: "طب الأطفال" },
    short: {
      fr: "Suivi de la croissance, vaccinations et urgences pédiatriques.",
      en: "Growth follow-up, vaccinations and pediatric emergencies.",
      ar: "متابعة النمو، التلقيحات والمستعجلات الخاصة بالأطفال.",
    },
    services: {
      fr: ["Suivi du nourrisson", "Vaccinations", "Certificats", "Urgences"],
      en: ["Infant follow-up", "Vaccinations", "Certificates", "Emergencies"],
      ar: ["متابعة الرضع", "التلقيحات", "الشواهد الطبية", "المستعجلات"],
    },
    duration: 20,
  },
  cardiologie: {
    name: { fr: "Cardiologie", en: "Cardiology", ar: "أمراض القلب" },
    short: {
      fr: "Bilan cardiaque, électrocardiogramme et échographie.",
      en: "Heart check-up, ECG and echocardiography.",
      ar: "فحص القلب، تخطيط القلب والفحص بالصدى.",
    },
    services: {
      fr: ["Bilan cardiaque", "ECG", "Échographie", "Test d'effort"],
      en: ["Heart check-up", "ECG", "Echocardiography", "Stress test"],
      ar: ["فحص القلب", "تخطيط القلب", "الفحص بالصدى", "اختبار الجهد"],
    },
    duration: 30,
  },
};
