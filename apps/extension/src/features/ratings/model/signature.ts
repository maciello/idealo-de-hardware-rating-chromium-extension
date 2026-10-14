import { cpuSignatureOf, type ItemRating } from "./cpu";
import { type GpuReading, gpuSignatureOf } from "./gpu";

/** Everything a chip renders: a changed signature re-renders it, an equal one leaves it alone. */
export const signatureOf = (rating: ItemRating, gpu: GpuReading | null): string =>
  `${cpuSignatureOf(rating)}|${gpuSignatureOf(gpu)}`;
