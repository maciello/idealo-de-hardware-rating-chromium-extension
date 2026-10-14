import { athlon, ryzen, ryzenThreadripper } from "./extractors/amd";
import { apple, mediatekKompanio, snapdragonX } from "./extractors/arm";
import {
  intelBareI,
  intelBrandedN,
  intelCoreI,
  intelCoreN,
  intelCoreNumbered,
  intelCoreUltra,
  intelEntry,
  intelN,
} from "./extractors/intel";
import type { CpuExtractor } from "./model";

/**
 * Every extractor in evaluation order. The order is behavior: on a tie between two matches at the same span,
 * the earlier extractor wins (see `findFound`).
 */
export const CPU_EXTRACTORS: readonly CpuExtractor[] = [
  intelCoreUltra,
  intelCoreI,
  intelBareI,
  intelCoreNumbered,
  intelN,
  intelBrandedN,
  intelCoreN,
  intelEntry,
  ryzenThreadripper,
  ryzen,
  athlon,
  apple,
  snapdragonX,
  mediatekKompanio,
];
