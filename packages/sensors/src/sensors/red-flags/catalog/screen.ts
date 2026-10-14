import { RED_FLAG_IDS as ID } from "../ids";
import { RED_FLAG_THRESHOLDS as T } from "../thresholds";
import { atMost, below, type FlagRule, flagRule } from "./model";

export const SCREEN_RULES: readonly FlagRule[] = [
  flagRule({
    id: ID.displayLowRes,
    device: "laptop",
    fields: ["displayHeightPx"],
    severity: "red",
    trips: ({ facts }) => below(facts.displayHeightPx, T.display.minHeightPx),
    params: ({ facts }) => ({
      heightPx: facts.displayHeightPx,
      minHeightPx: T.display.minHeightPx,
    }),
  }),
  flagRule({
    id: ID.displayDim,
    device: "laptop",
    fields: ["brightnessNits"],
    severity: "amber",
    trips: ({ facts }) => atMost(facts.brightnessNits, T.display.dimMaxNits),
    params: ({ facts }) => ({ nits: facts.brightnessNits }),
  }),
];
