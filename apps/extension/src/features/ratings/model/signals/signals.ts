import { type SensorClock, type Signal, senseAll } from "@idealo-hw/sensors";
import type { ItemRating } from "../cpu";
import type { RatingQuery } from "../query";
import { sensorInputOf } from "./sensor-input";

/**
 * Badges and flags the product sensors raise for one item. They are product facts: an item whose CPU
 * is ambiguous or unmatched still gets its flags, and a matched CPU only adds the benchmark side.
 */
export const signalsOf = (
  query: RatingQuery,
  rating: ItemRating,
  now: SensorClock,
): readonly Signal[] =>
  senseAll(sensorInputOf(query, rating.status === "matched" ? rating.record : null, now));
