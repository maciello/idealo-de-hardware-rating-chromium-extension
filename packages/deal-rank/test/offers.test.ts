import { describe, expect, it } from "vitest";
import { bestOffer, shopTrust, trustedOffer } from "../src";
import { offer } from "./helpers";

describe("offers", () => {
  const offers = [
    offer({ shop: "Cheap", price_eur: 800, shipping_eur: 0, marketplace: true }),
    offer({ shop: "Thin", price_eur: 810, rating_count: 20 }),
    offer({ shop: "Solid", price_eur: 820, shipping_eur: 5 }),
    offer({ shop: "Free", price_eur: 830, shipping_eur: 0 }),
  ];

  it("ranks on price plus shipping", () => {
    expect(bestOffer(offers)?.shop).toBe("Cheap");
    expect(bestOffer(offers)?.total_eur).toBe(800);
    expect(bestOffer([offer({ price_eur: 100, shipping_eur: 4.9 })])?.total_eur).toBe(104.9);
  });
  it("trusts the cheapest non-marketplace shop with 4.0+ and 100+ ratings", () => {
    expect(trustedOffer(offers)?.shop).toBe("Solid");
    expect(trustedOffer([offer({ rating_avg: null })])).toBeNull();
  });
  it("computes shop trust", () => {
    expect(shopTrust(offer({ marketplace: true }))).toBe(0);
    expect(shopTrust(offer({ rating_avg: null }))).toBe(0);
    expect(shopTrust(offer({ rating_avg: 5, rating_count: 999 }))).toBeCloseTo(1, 6);
    expect(shopTrust(offer({ rating_avg: 4, rating_count: 9 }))).toBeCloseTo((4 / 5) * (1 / 3), 6);
  });
});
