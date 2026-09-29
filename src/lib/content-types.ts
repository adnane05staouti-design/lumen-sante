import type { SpecialtyId } from "@/config/clinic";
import type { Localized } from "@/lib/i18n";

/** Types shared with client components (no server code here). */
export type SpecialtyTexts = Record<SpecialtyId, { name: string; short: string; services: string[]; duration: number }>;
export type Stat = { live: string | null; value: number; prefix: string; suffix: string; label: Localized };
export type GalleryItem = { src: string; caption: Localized };
export type Identity = {
  name: string;
  logo: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  address: Localized;
  hours: { weekdays: string; saturday: string };
  theme: { accent: string; accent2: string };
};
