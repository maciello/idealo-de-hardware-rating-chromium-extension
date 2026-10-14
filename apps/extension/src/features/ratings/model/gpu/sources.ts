import { parseSpecBlock, productContextFromSpecs } from "@idealo-hw/hw-bench";
import type { RatingQuery } from "../query";
import { fragmentsOf } from "../text-fragments";

/** The datasheet's graphics row first, then spec fragments, then the marketing title as the fallback. */
export const gpuSourcesOf = ({ title, text }: RatingQuery): string[] => {
  const labelled = productContextFromSpecs(parseSpecBlock(text)).gpuText;
  return [...(labelled === undefined ? [] : [labelled]), ...fragmentsOf(text), title];
};

/**
 * Where the CPU is named, in the order the CPU engine reads it (datasheet row, fragments, title), then the name of the
 * PassMark record the CPU engine matched, which names the CPU even when the tile only abbreviates it.
 */
export const cpuSourcesOf = (
  { title, text }: RatingQuery,
  matchedCpuName: string | undefined,
): string[] => {
  const labelled = productContextFromSpecs(parseSpecBlock(text)).cpuText;
  return [
    ...(labelled === undefined ? [] : [labelled]),
    ...fragmentsOf(text),
    title,
    ...(matchedCpuName === undefined ? [] : [matchedCpuName]),
  ];
};
