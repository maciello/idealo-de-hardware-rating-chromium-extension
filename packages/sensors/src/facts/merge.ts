import type { ProductFacts, WebcamFact } from "./model";

/** A stated absence stands alone; two presences complement each other, the first value winning. */
const mergeWebcam = (first: WebcamFact, second: WebcamFact): WebcamFact =>
  !first.present || !second.present ? first : { ...second, ...first };

/**
 * Layers in priority order: the first layer that states a fact wins (datasheet before tile). The
 * camera is one fact stated in pieces, so its pieces merge instead.
 */
export function mergeFacts(...layers: readonly ProductFacts[]): ProductFacts {
  let merged: ProductFacts = {};
  for (const layer of [...layers].reverse()) {
    const webcam =
      merged.webcam !== undefined && layer.webcam !== undefined
        ? mergeWebcam(layer.webcam, merged.webcam)
        : undefined;
    merged = { ...merged, ...layer, ...(webcam === undefined ? {} : { webcam }) };
  }
  return merged;
}
