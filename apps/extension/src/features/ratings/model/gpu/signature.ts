import { valuesOf } from "../values-signature";
import type { GpuPart, GpuReading } from "./reading";

const memorySignatureOf = (part: GpuPart): string =>
  part.memory === null
    ? "-"
    : `${part.memory.source}:${part.memory.megabytes ?? "-"}:${part.memory.type ?? "-"}`;

const partSignatureOf = (part: GpuPart): string => {
  const { rating } = part;
  const rated =
    rating === null
      ? "unrated"
      : `${rating.record.id}:${rating.formFactor}:${rating.lowerBound ? "lb" : "ex"}:${valuesOf(rating.ratings)}`;
  return `${part.kind}:${part.name}:${rated}:${memorySignatureOf(part)}:${part.approximated ? "ap" : "-"}`;
};

export const gpuSignatureOf = (gpu: GpuReading | null): string =>
  gpu === null
    ? "-"
    : `g:${partSignatureOf(gpu.primary)}+${gpu.companion === null ? "-" : partSignatureOf(gpu.companion)}`;
