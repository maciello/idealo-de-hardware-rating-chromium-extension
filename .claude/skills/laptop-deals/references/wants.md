# Wants: from the user's words to `wants.yaml`

Exact fields: `just deals-schema`. Hard limits exclude a laptop; weights (0–5) only rank. If you are unsure whether something is a deal-breaker, make it a weight and mention it. A hard limit that is too strict hides good options without anyone noticing.

## Phrase → field

| User says | Hard | Weight |
|---|---|---|
| "1.000–2.500 €", "under 2k" | `budget_eur: {min, max}` | `price` 2–3 |
| "at least 32 GB" | `ram_gb_min: 32` | `ram_gb` 1 |
| "business", "no gaming look" | `product_types_allowed: [business, multimedia, convertible]` (drop gaming; keep multimedia for understated creator laptops) | — |
| "good webcam" | `webcam_mp_min: 2` (1080p and up) | `webcam_mp` 1–2 |
| "fast", "for compiling" | — | `cpu_mark` 2–3 |
| "local AI", small models | — | `ai_memory_gb` 2, `g3d_mark` 1–2 |
| "bigger models", "shared memory", "AI chips" | `ai_memory_gb_min: 24` (or more) | `ai_memory_gb` 3–4 |
| "dedicated / NVIDIA / AMD GPU" | `require_dedicated_gpu: true` | `vram_gb` 2, `g3d_mark` 2 |
| "light", "travel" | `weight_kg_max: 1.6` if they insist | `weight_kg` 2 |
| "long battery" | — | `battery_wh` 2 |
| "bright screen", "outdoors" | `display_nits_min: 400` if they insist | `display_nits` 2 |
| "really good deal", "underpriced" | — | `price_vs_30d_low` 2, `price` 3 |
| "trustworthy shop" | — | `shop_trust` 1–2 |
| "German keyboard" | not checkable from data; handled in the judgment pass | — |

## Presets (starting points; adjust to the ask)

```yaml
# business all-rounder
weights: {price: 3, cpu_mark: 2, g3d_mark: 1, webcam_mp: 1, display_nits: 1, battery_wh: 1, weight_kg: 1, price_vs_30d_low: 2, shop_trust: 1}

# local AI, small models (7–14B) + video calls
weights: {price: 2, ai_memory_gb: 2, g3d_mark: 2, cpu_mark: 1, webcam_mp: 1, price_vs_30d_low: 1, shop_trust: 1}

# bigger models (30–70B): memory the GPU can use matters most
hard: {ai_memory_gb_min: 24}
weights: {ai_memory_gb: 4, g3d_mark: 2, price: 2, cpu_mark: 1, price_vs_30d_low: 1}
```

`ai_memory_gb` is the script's estimate of memory a model can run in: the dedicated card's VRAM, or about three quarters of RAM on fast shared-memory chips (Ryzen AI Max / Radeon 8040S–8060S, Apple Pro/Max), else 0. Say "estimate" when you quote it.

`top_n` defaults to 5. Use 10 when the user asks for a longer list or the pool is large.
