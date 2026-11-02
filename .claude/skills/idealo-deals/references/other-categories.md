# Other idealo categories (cameras, phones, monitors, headphones, TVs, ...)

The ranking core has no laptop assumptions. For a new category you define what matters as **custom metrics** (numbers) and **features** (yes/no), and leave the laptop fields null. Run without `--passmark-dir`.

## 1. Find the category and its filters
Run one discovery `search_products` with a plain query ("Systemkamera", "Smartphone 256GB", "Monitor 27 Zoll 4K"). Read `availableCategories` for the category id and `availableFilters` for useful labels (brand, size, resolution, memory). Lenses work as for laptops: 2–4 angles, pooled.

## 2. Decide metrics and features from the ask, before extracting
Keep it to what the user cares about plus price; 3–6 metrics is typical. Name keys in snake_case with the unit in the name.

| Category | Typical custom metrics (direction) | Typical features |
|---|---|---|
| Cameras | `sensor_mp` (higher), `optical_zoom_x` (higher), `video_max_k` (higher), `weight_g` (lower), `battery_shots` (higher) | `image_stabilisation`, `weather_sealed`, `viewfinder`, `flip_screen` |
| Phones | `storage_gb` (higher), `ram_gb` via extra (higher), `battery_mah` (higher), `screen_in` (higher or lower per ask), `update_years` (higher), `weight_g` (lower) | `esim`, `wireless_charging`, `ip68`, `headphone_jack` |
| Monitors | `diagonal_in`, `refresh_hz`, `nits` (higher), `response_ms` (lower), `color_gamut_dci_p3_pct` (higher) | `usb_c_power`, `kvm`, `height_adjustable`, `hdr` |
| Headphones | `battery_h` (higher), `weight_g` (lower) | `anc`, `multipoint`, `ldac`, `wired_option` |
| TVs | `diagonal_in`, `nits` (higher), `input_lag_ms` (lower) | `oled`, `hdmi_2_1`, `dolby_vision` |

Declare each metric in wants.yaml:
```yaml
custom_metrics:
  - {key: sensor_mp, direction: higher, label: "Sensor MP"}
  - {key: weight_g, direction: lower, label: "Weight g"}
weights: {price: 3, sensor_mp: 2, weight_g: 1, price_vs_30d_low: 1}
feature_weights: {image_stabilisation: 2}
must_have_features: [weather_sealed]
hard: {custom: [{key: weight_g, max: 700}]}
```

## 3. Extract
Fill the same candidate form as for laptops (see `just deals-schema`). Product-independent fields: sku, name, url, found_by, fetched_at, product_type (from idealo's type label, lowercase, else "unknown"), offers, listed_since, test_grade, bargain_badge_pct, price_history_cents, agent_flags, notes. Put the category figures into `extra` and the yes/no items into `features`; set laptop fields (cpu, gpu, ram_gb, display, webcam, ...) to null. Copy only what the spec sheet states; a missing figure stays null and shows up as "missing" in the report instead of being guessed.

Subagent brief: as in `laptop-extraction.md`, but list the `extra` keys and `features` names you chose so every subagent uses the same ones.

## 4. Judge and answer
`references/judgment.md` applies except the laptop-only points (keyboard, RAM channels, benchmarks). Category-specific catches go in notes, e.g. a camera sold as a body without a lens, a phone that is a refurbished or import model, a monitor with a different panel revision.
