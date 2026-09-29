import type { SpecialtyId } from "@/config/clinic";
import type { ShapeName } from "./shapes";

/** Which particle shape illustrates each specialty. */
export const specialtyShape: Record<SpecialtyId, ShapeName> = {
  dentaire: "tooth",
  ophtalmologie: "eye",
  psychiatrie: "brain",
  dermatologie: "skin",
  pediatrie: "bear",
  cardiologie: "heart",
};
