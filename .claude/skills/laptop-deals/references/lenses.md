# Lenses: search angles that surface different laptops

Run 2–4 per request and pool them. Pick filter ids **by these labels** from `availableFilters` in a discovery response. Ids can change; the labels are what idealo shows. Category: "Notebooks".

| Lens id (suggested) | When | Query text | Filters by label | Notes |
|---|---|---|---|---|
| `business` | almost always | "Business Notebook" | Produkttyp: Business Notebook; RAM: every size ≥ the minimum | The core angle: ThinkPad, EliteBook, ProBook, ExpertBook, Latitude. |
| `business-intel` / `business-amd` | the business lens is crowded | "Business Notebook" | + Prozessorhersteller: Intel or AMD | Splitting shows more than 10 per side. |
| `dgpu` | dedicated GPU wanted, or local AI | "Notebook RTX" or "Workstation" | Grafikkarte: RTX PRO / RTX 500–2000 Ada / GeForce RTX 4050–5070; optionally Produkttyp Business or Multimedia | Workstations (ThinkPad P, ZBook, Precision) plus creator laptops. Skip the Gaming Notebook type when the user wants no gaming look. |
| `unified` | bigger AI models, "shared memory", "AI chips" | "Ryzen AI Max" | RAM: 64 / 96 / 128 GB | Strix Halo laptops (ZBook Ultra, ProArt PX13, ROG Flow Z13). Check RAM per SKU: many listings are 32 GB. |
| `apple` | user is open to macOS, or wants the best webcam and battery | "Apple MacBook Air 32GB" / "MacBook Pro" | RAM: 32 / 48 / 64 GB | Unified memory; PassMark GPU scores are not comparable, so judge by memory. |
| `newgen` | "latest", or to see the new chips | "Panther Lake" or "Ryzen AI 400" | Prozessor Codename label | New chips often have few PassMark samples: the report flags them. |
| `bigram` | ≥ 48 GB wanted without a GPU focus | "Notebook" | RAM: 48 / 64 / 96 GB; Produkttyp: Business | Watch for reseller-modified "T-DEV" listings (agent flag `reseller_modified`). |
| `previous` | re-checking earlier picks | the old SKUs as text | none | Put old picks here so the report shows them next to today's options. |

Shared rules:
- Set `minPrice`/`maxPrice` from the budget. For a "what does it cost?" check (e.g. 64 GB Strix Halo), widen max for that lens alone and say so.
- `availableOnly: true`.
- A result list with `badges.bargain` is not a reason to shortlist; the script checks badges against the 30-day history.
