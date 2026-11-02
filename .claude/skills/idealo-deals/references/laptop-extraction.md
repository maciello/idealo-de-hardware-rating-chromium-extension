# Extraction: `get_product_details` → candidate YAML

`just deals-schema` is the exact contract. This page says where each value comes from and how to convert it. Copy values; never estimate a missing one. `null` is a valid answer, and the script turns it into a visible "missing" or "unverified" note instead of a silent guess.

## Field sources (idealo response → candidate field)

| Field | Source | Conversion |
|---|---|---|
| `sku` | `nameDelta` | as is |
| `name`, `url` | `name`, `url` | as is |
| `found_by` | the lens id(s) that surfaced it | list |
| `fetched_at` | today | ISO date |
| `product_type` | spec "Notebook-Typ" | Business Notebook → business, Multimedia → multimedia, Gaming → gaming, Convertible → convertible, else unknown |
| `offers[]` | `offers[]` | `shop.name` (marketplace: add ` / merchantName`), `price` → number (1.207,99 → 1207.99), `minShippingCost` → `shipping_eur`, `shop.rating.avg/count` (null stays null), `shop.isMarketplace`, `payments[].costCode` |
| `cpu` | spec "Prozessor" | as is |
| `gpu` | spec "Grafikkarte" | as is |
| `vram_gb` | spec "Grafikspeicher" when it is a size (8192 MB → 8) | "Shared Memory" or absent → null |
| `ram_gb`, `ram_type` | "RAM", "RAM Typ" | 32 GB → 32 |
| `ssd_gb` | "SSD-Speicher" | 1.000 GB / 1 TB → 1000 |
| `display` | "Displaygröße", "Displayauflösung", "Helligkeit", "Bildwiederholungsrate", "Display"/"Displays" | 16 Zoll → 16; 1.920 x 1.200 → 1920/1200; 400 cd/m² → 400; panel words into `panel` |
| `webcam` | "Webcam", "Kameraauflösung", "Kamerafunktion" | "5.0 Megapixel" → megapixels 5; "1920 x 1080 Pixel" → height_px 1080; "Infrarot" → ir true; only "integriert" → all null |
| `battery_wh`, `weight_kg` | "Wattstunden", "Gewicht" | 74,5 Wh → 74.5; 1,46 kg → 1.46 |
| `wifi_standard`, `ports_text`, `video_outputs`, `mobile_data`, `os` | "WLAN-Standard(s)", "Anschlüsse", "Videoausgänge", "mobile Datenkommunikation", "Betriebssystem" | text as is |
| `listed_since` | "Gelistet seit" | Oktober 2026 → 2026-10 |
| `test_grade` | `testReports.summary.grade` | "1,8" → 1.8; absent → null |
| `bargain_badge_pct` | `badges.bargain.discountRate` | number or null |
| `price_history_cents` | `priceTrend.history[].price` | the integers in order |
| `features` | spec lines, yes/no | lowercase snake_case, only when the SKU's spec says so: `numpad` ("Nummernblock"), `backlit_keyboard` ("beleuchtete Tastatur"), `fingerprint_reader`, `ir_camera` ("Infrarot"), `privacy_shutter`, `sd_reader` ("Kartenleser"), `ethernet` ("Ethernet"/"LAN"), `spill_resistant_keyboard` ("spritzwassergeschützt"). Use the same names the wants file uses. |
| `extra` | any other figure the ask needs | snake_case key with unit, e.g. `color_gamut_srgb_pct`, `speaker_w`; declare the key in wants `custom_metrics` |
| `agent_flags`, `notes` | your reading | see below |

## Agent flags and notes (the fuzzy part)
- `single_channel_ram`: a test summary or con says the RAM runs single-channel ("Single-Channel"). It hurts integrated graphics and local AI.
- `soldered_ram`: a test says RAM is soldered ("verlötet", "nicht austauschbar").
- `spec_conflict`: pros, cons or a test describe another configuration (a different screen, 120 Hz vs 60 Hz). Add a note naming the conflict.
- `reseller_modified`: a reseller config such as "T-DEV…" or a title listing upgraded parts.
- `refurbished`: "refurbished", "generalüberholt", "B-Ware".
- `keyboard_not_german` or `keyboard_unverified`: set one when the name, SKU or offer says so (Lenovo SKUs ending "GE" are German; Apple configs ending "DE_CTO" are German). Otherwise leave both unset; the judgment pass decides.
- `notes`: short facts worth keeping, e.g. "IR camera only in category pros", "test of sibling SKU A3ZQ0ET", "cheaper offer not returned (relocator pos=1 missing)".

idealo's `prosCons` often describe the whole series, not this SKU. Use them for notes and flags, never as spec values.

## Subagent brief (for fan-out of more than 6 products)
> Load `mcp__idealo_de__get_product_details` with ToolSearch, call it once per productRef below (in parallel), and return ONLY a YAML document `candidates: [...]` that follows `just deals-schema` (candidates part) and the field table in `.claude/skills/idealo-deals/references/laptop-extraction.md`. Copy values exactly; use null for anything absent. found_by: [<lens>], fetched_at: <date>. Use no other tools and write no files. Refs: <list>
