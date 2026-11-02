# Laptop wants: from the user's words to `wants.yaml`

Exact fields: `just deals-schema`. Hard limits exclude; weights (0–5) only rank. If unsure whether something is a deal-breaker, make it a weight and mention it. A hard limit that is too strict silently hides good options.

## Phrase → field

| User says | Hard | Weight / feature |
|---|---|---|
| "1.000–2.500 €", "under 2k" | `budget_eur: {min, max}` | `price` 2–3 |
| "at least 32 GB" | `ram_gb_min: 32` | `ram_gb` 1 |
| "business", "no gaming look" | `product_types_allowed: [business, multimedia, convertible]` | — |
| "gaming", "play games" | allow `gaming`; `require_dedicated_gpu: true` if they mean modern 3D games | `g3d_mark` 4, `vram_gb` 2, `refresh_hz` 2, `cpu_mark` 1 |
| "good webcam", "lots of video calls" | `webcam_mp_min: 2` (1080p and up) | `webcam_mp` 2; features `ir_camera` 1, `privacy_shutter` 1 |
| "streaming", "content creation" | — | `webcam_mp` 2, `cpu_mark` 2, `g3d_mark` 1; custom `speaker_w` if they care |
| "photo/video editing" | `display_nits_min: 400` if they insist | `display_nits` 2, `g3d_mark` 2, `cpu_mark` 2; custom `color_gamut_srgb_pct` 2; feature `oled` |
| "developer", "compiling", "VMs" | `ram_gb_min: 32` | `cpu_mark` 3, `ram_gb` 2, `ssd_gb` 1 |
| "student", "cheap but good" | — | `price` 4, `battery_wh` 2, `weight_kg` 1, `price_vs_30d_low` 2 |
| "travel", "light" | `weight_kg_max: 1.5` if they insist | `weight_kg` 3, `battery_wh` 2; features `mobile_data`, `wifi7` |
| "office", "just email and docs" | — | `price` 4, `battery_wh` 1, `display_nits` 1; feature `numpad` if they want it |
| "local AI", small models | — | `ai_memory_gb` 2, `g3d_mark` 2 |
| "bigger models", "shared memory", "AI chips" | `ai_memory_gb_min: 24` (or more) | `ai_memory_gb` 4, `g3d_mark` 2 |
| "dedicated / NVIDIA / AMD GPU" | `require_dedicated_gpu: true` | `vram_gb` 2, `g3d_mark` 2 |
| "long battery" | — | `battery_wh` 2 |
| "bright screen", "outdoors" | `display_nits_min: 400` if they insist | `display_nits` 2; feature `matte` |
| "high refresh", "smooth screen" | `refresh_hz_min: 120` if they insist | `refresh_hz` 2 |
| "really good deal", "underpriced" | — | `price_vs_30d_low` 2, `price` 3 |
| "trustworthy shop" | — | `shop_trust` 1–2 |
| "must have X" (numpad, fingerprint, backlit keyboard, SD reader...) | `must_have_features: [x]` | — |
| "German keyboard" | not checkable from data; handled in the judgment pass | — |

Feature names are lowercase snake_case and must match what you put in candidate `features` (see `laptop-extraction.md`).

## Presets (starting points; adjust to the ask)

```yaml
# business all-rounder
weights: {price: 3, cpu_mark: 2, g3d_mark: 1, webcam_mp: 1, display_nits: 1, battery_wh: 1, weight_kg: 1, price_vs_30d_low: 2, shop_trust: 1}

# gaming
hard: {require_dedicated_gpu: true}
weights: {g3d_mark: 4, vram_gb: 2, refresh_hz: 2, cpu_mark: 1, price: 3, price_vs_30d_low: 1}

# video calls / remote work
hard: {webcam_mp_min: 2}
weights: {webcam_mp: 2, battery_wh: 2, weight_kg: 1, display_nits: 1, price: 3}
feature_weights: {ir_camera: 1, privacy_shutter: 1}

# photo / video editing
custom_metrics: [{key: color_gamut_srgb_pct, direction: higher, label: "sRGB %"}]
weights: {display_nits: 2, color_gamut_srgb_pct: 2, g3d_mark: 2, cpu_mark: 2, ram_gb: 1, price: 2}

# local AI, small models (7–14B)
weights: {price: 2, ai_memory_gb: 2, g3d_mark: 2, cpu_mark: 1, webcam_mp: 1, price_vs_30d_low: 1}

# bigger models (30–70B): memory the GPU can use matters most
hard: {ai_memory_gb_min: 24}
weights: {ai_memory_gb: 4, g3d_mark: 2, price: 2, cpu_mark: 1, price_vs_30d_low: 1}
```

`ai_memory_gb` is the script's estimate of memory a model can run in: the dedicated card's VRAM, or about three quarters of RAM on fast shared-memory chips (Ryzen AI Max / Radeon 8040S–8060S, Apple Pro/Max), else 0. Say "estimate" when you quote it.

`top_n` defaults to 5. Use 10 when the user asks for a longer list or the pool is large.
