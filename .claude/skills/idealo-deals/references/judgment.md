# Judgment pass on the top N

The script finds patterns in structured fields. It cannot read a seller's reputation, a keyboard layout, or which of two contradicting texts is true. Check each top-N candidate for the following, record what you find as `agent_flags` or `notes`, and re-run `just deals rank` if you changed anything.

1. **Who sells it.** If the report flags `marketplace_offer`, `low_trust_shop`, `limited_payment` or `single_offer`, name the shop, its rating and its payment methods in the answer. When a trusted offer exists, give its price too (the `trusted_offer_premium` param). Prepay-only offers from small shops: advise PayPal for buyer protection.
2. **Keyboard layout.** Lenovo "…GE" and Apple "…DE_CTO" mean German. HP and other regional suffixes do not tell you reliably. Say "ask the shop to confirm QWERTZ" instead of guessing.
3. **Claims that come only from idealo's category text.** An IR camera, 120 Hz, or "single-channel" mentioned only in `prosCons` or in a test of a sibling SKU is not a spec of this product. Name it as unconfirmed.
4. **Single-channel RAM.** If flagged, say that integrated graphics (and local AI on them) run clearly slower until a second module is added. Intel only uses the "Arc" GPU name with dual-channel RAM, so a listing that says Arc and a test that says single-channel conflict: point this out.
5. **Discount badges.** `badge_inflated` means the badge measures against a price far above the 30-day low. Say what the real low was and when (from the history and dips).
6. **Missing cheaper offers.** If the last price-history point is below the cheapest shown offer, call `get_product_offers` before you quote a price.
7. **Few benchmark samples.** `few_benchmark_samples` (fewer than 30 PassMark runs): quote the number with "early score, few samples".
8. **AI memory is an estimate.** Say so, and say whether it comes from a dedicated card (VRAM) or from shared memory.
9. **Ruled-out list.** Take the most instructive exclusions from `excluded` (e.g. "64 GB version exists but costs 2.899 €") so the user sees the next step up or down.
