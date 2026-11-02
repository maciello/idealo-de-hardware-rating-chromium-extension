import { describe, expect, it } from "vitest";
import { rankDeals } from "../src";
import { candidate, lookupOf, offer, wants } from "./helpers";

const flagsOf = (
  c: ReturnType<typeof candidate>,
  lookup = lookupOf({ CPU: { mark: 1, samples: 10 } }),
) => rankDeals([c], wants(), lookup).ranked[0]?.red_flags ?? [];
const ids = (c: ReturnType<typeof candidate>) => flagsOf(c).map((f) => f.id);

describe("red flags", () => {
  it("flags weak hardware", () => {
    const found = ids(
      candidate({
        display: { nits: 300 },
        webcam: { height_px: 720 },
        ssd_gb: 512,
        battery_wh: 40,
      }),
    );
    expect(found).toEqual(
      expect.arrayContaining(["low_res_webcam", "dim_display", "small_ssd", "small_battery"]),
    );
  });
  it("flags weak offers", () => {
    const c = candidate({
      offers: [
        offer({ shop: "M", price_eur: 500, marketplace: true, payments: ["PP"], rating_count: 10 }),
        offer({ shop: "T", price_eur: 560 }),
      ],
    });
    expect(ids(c)).toEqual(
      expect.arrayContaining([
        "marketplace_offer",
        "limited_payment",
        "low_trust_shop",
        "trusted_offer_premium",
      ]),
    );
    const premium = flagsOf(c).find((f) => f.id === "trusted_offer_premium");
    expect(premium?.params).toMatchObject({ delta: 60, shop: "T" });
    expect(ids(candidate())).toContain("single_offer");
  });
  it("flags data gaps", () => {
    const c = candidate({ cpu: "CPU", gpu: "Mystery GPU", listed_since: "2026-10" });
    const lookup = { ...lookupOf({ CPU: { mark: 1, samples: 10 } }), gpu: () => null };
    const found = rankDeals([c], wants(), lookup).ranked[0]?.red_flags.map((f) => f.id);
    expect(found).toEqual(
      expect.arrayContaining(["few_benchmark_samples", "no_gpu_benchmark", "new_untested"]),
    );
    expect(found).not.toContain("no_cpu_benchmark");
    expect(ids(candidate({ cpu: "Unknown CPU" }))).toContain("no_cpu_benchmark");
  });
  it("does not report benchmark gaps when cpu and gpu are null", () => {
    const found = ids(candidate());
    expect(found).not.toContain("no_cpu_benchmark");
    expect(found).not.toContain("no_gpu_benchmark");
  });
  it("is not new_untested once graded or listed long ago", () => {
    expect(ids(candidate({ listed_since: "2026-10", test_grade: 1.8 }))).not.toContain(
      "new_untested",
    );
    expect(ids(candidate({ listed_since: "2026-05" }))).not.toContain("new_untested");
  });
  it("flags prices well above the 30-day low and inflated badges", () => {
    const c = candidate({
      offers: [offer({ price_eur: 1000 })],
      price_history_cents: [80_000, 85_000, 90_000],
      bargain_badge_pct: 12,
    });
    expect(ids(c)).toEqual(expect.arrayContaining(["above_30d_low", "badge_inflated"]));
  });
  it("passes agent flags through", () => {
    expect(ids(candidate({ agent_flags: ["soldered_ram"] }))).toContain("soldered_ram");
  });
});
