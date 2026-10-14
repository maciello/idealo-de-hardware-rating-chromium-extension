import type { Rating } from "@idealo-hw/hw-bench";
import type { MatchedRating } from "../../model";

export const findRating = (rating: MatchedRating, id: string): Rating | undefined =>
  rating.ratings.find((r) => r.strategyId === id);
