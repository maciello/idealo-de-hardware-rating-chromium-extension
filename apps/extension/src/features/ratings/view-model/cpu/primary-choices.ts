import { RATINGS_COPY } from "../../copy";
import { MULTI, PAGE_RANK, PER_EURO, SINGLE } from "../../model";

/** The four numbers a user can pick as the chip's headline value. */
export const PRIMARY_CHOICES: readonly { id: string; label: string }[] = [
  MULTI,
  SINGLE,
  PER_EURO,
  PAGE_RANK,
].map((id) => ({ id, label: RATINGS_COPY.primaryLabels[id] ?? id }));
