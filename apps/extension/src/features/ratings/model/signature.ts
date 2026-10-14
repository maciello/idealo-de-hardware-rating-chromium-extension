import type { Signal } from "@idealo-hw/sensors";
import { cpuSignatureOf, type ItemRating } from "./cpu";
import { type GpuReading, gpuSignatureOf } from "./gpu";
import { signalsSignatureOf } from "./signals";

/** Everything a chip renders: a changed signature re-renders it, an equal one leaves it alone. */
export const signatureOf = (
  rating: ItemRating,
  gpu: GpuReading | null,
  signals: readonly Signal[],
): string => `${cpuSignatureOf(rating)}|${gpuSignatureOf(gpu)}|${signalsSignatureOf(signals)}`;
