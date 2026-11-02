import type { Offer } from "./candidate";

export interface OfferView extends Offer {
  total_eur: number;
}

const TRUSTED_MIN_RATING = 4.0;
const TRUSTED_MIN_COUNT = 100;

/** Rounds to cents so sums such as 0.1 + 0.2 do not leak float noise into reports. */
const roundCents = (value: number): number => Math.round(value * 100) / 100;

const offerView = (offer: Offer): OfferView => ({
  ...offer,
  total_eur: roundCents(offer.price_eur + offer.shipping_eur),
});

const cheapest = (offers: readonly OfferView[]): OfferView | null =>
  offers.reduce<OfferView | null>(
    (best, next) => (best === null || next.total_eur < best.total_eur ? next : best),
    null,
  );

/** The offer with the lowest price plus shipping; the first one listed on a tie. */
export function bestOffer(offers: readonly Offer[]): OfferView | null {
  return cheapest(offers.map(offerView));
}

/**
 * Lowest total among offers that are not marketplace sales and whose shop has a rating of at least 4.0
 * from at least 100 ratings. Null when no offer qualifies.
 */
export function trustedOffer(offers: readonly Offer[]): OfferView | null {
  return cheapest(
    offers
      .filter(
        (offer) =>
          !offer.marketplace &&
          offer.rating_avg !== null &&
          offer.rating_count !== null &&
          offer.rating_avg >= TRUSTED_MIN_RATING &&
          offer.rating_count >= TRUSTED_MIN_COUNT,
      )
      .map(offerView),
  );
}

/** 0..1: rating out of 5 times a confidence factor that reaches 1 at 999 ratings. 0 for marketplace or unrated. */
export function shopTrust(offer: Offer): number {
  if (offer.marketplace || offer.rating_avg === null) return 0;
  const count = offer.rating_count ?? 0;
  return (offer.rating_avg / 5) * Math.min(1, Math.log10(count + 1) / 3);
}
