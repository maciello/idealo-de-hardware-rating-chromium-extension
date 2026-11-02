---
name: laptop-deals
description: Find and rank the best laptop deals on idealo.de for what the user wants (budget range, minimum RAM, business look, webcam, local AI or shared-memory chips, dedicated GPU, weight, keyboard layout) and return a top-N with specs, PassMark CPU/GPU scores, standout features, red flags, 30-day price context and idealo links. Use this whenever someone asks for the best/cheapest/top laptops or notebooks, wants laptop deals checked or compared, asks "which laptop should I buy", asks whether earlier picks are still cheap, or wants several search angles pooled into one ranking, even if they never say idealo, ranking or skill.
---

# Laptop deals on idealo.de

You do the parts that need reading and judgment: turn the ask into wants, search idealo through its MCP, read spec sheets into a fixed form, and check the top picks for catches. `just deals` does every number: benchmark lookup, prices with shipping, 30-day price stats, hard filters, weighted score, standouts, red flags, top N. Keep that split. Hand-computed rankings drift and are hard to check; the script's report.json is the single source for every figure you quote.

## Before you start
- Tools: `mcp__idealo_de__search_products`, `get_product_details`, `get_product_offers`, `get_product_price_history`.
- Benchmarks: PassMark files in `data/` (`just fetch-passmark`). They are private: never commit them, never paste them into repo files. If the fetch fails, use what is in `data/` and say how old it is (file date).
- Work in the session scratchpad, e.g. `<scratchpad>/deals/<yyyy-mm-dd>/`. Everything you pull from idealo stays there; idealo MCP data is never committed (ADR 0008 in this repo).
- Field reference: `just deals-schema` prints the exact JSON Schema for both input files. Read it once per session; it beats any copy in prose.

## Workflow

### 1. Wants → `wants.yaml`
Translate the ask into hard limits (exclude) and weights (rank). Read `references/wants.md` for phrase mappings and presets. Pick sensible defaults instead of asking; state them in the answer. Ask only when the budget is unknown and cannot be inferred.

### 2. Plan 2–4 lenses
A lens is one search angle. Different angles surface different laptops: a "business + 32 GB" search never shows a creator laptop with an RTX card. Run several and pool them. `references/lenses.md` lists proven angles and the idealo filter labels each one needs. Give each lens a short id; list them under `lenses:` in wants.yaml.

### 3. Search
- One discovery call per category to read `availableFilters`, then pick filter ids **by label** (e.g. RAM "32 GB", Produkttyp "Business Notebook"). Ids are not stable knowledge; labels are.
- `includeSearchFilters` needs `includeCategories` (notebooks: the category named "Notebooks" in the response). Several values of one attribute widen the search (OR); values of different attributes narrow it (AND).
- Use `minPrice`/`maxPrice` from the budget and `availableOnly: true`.
- One call returns 10 results. If a lens is crowded, split it (by manufacturer, processor or price band) rather than paging blindly.

### 4. Shortlist
From each lens keep the plausible results (drop obvious misses: wrong RAM in the title, a series the user excluded). Dedupe by `nameDelta` (the model number). Aim for 10–20 candidates in total; detail calls are the expensive part and idealo traffic stays low-volume.

### 5. Details → candidate files
Call `get_product_details` for each shortlisted `productRef` and fill the form in `references/extraction.md`. For more than 6 products, fan out: give each subagent (Sonnet is enough) at most 6 refs plus the brief in that file, and let it return YAML. Write one file per lens or batch, e.g. `candidates-business.yaml`. If the cheapest shown offer is above the last price-history point, a cheaper offer was not returned: call `get_product_offers` for that product.

### 6. Rank
```
just deals rank --wants <dir>/wants.yaml --candidates <dir>/candidates-*.yaml --passmark-dir data --out <dir>/out
```
Pass every candidate file; the script pools them and merges duplicates across lenses. Read `out/report.md` first, then `out/report.json` for exact values.

### 7. Judgment pass on the top N
Work through `references/judgment.md`: seller trust, keyboard layout, claims that come only from idealo's category text, single-channel RAM, inflated discount badges, missing cheaper offers. If you correct a candidate (add an agent flag or a note, fix a field), re-run step 6 so the report stays the source of truth.

### 8. Answer
- Lead with the pick and its price, then a ranked table (laptop with idealo link, total price, CPU Mark, G3D Mark, RAM, webcam, screen, battery, weight).
- One short block per pick: standouts, catches, 30-day price story, best and trusted offer.
- Then a short "ruled out" table with reasons, then the recommendation.
- Numbers come from report.json or tool output only. German number format (1.207,99 €). Say when prices were fetched; idealo prices move daily.
- Plain words, no marketing language. Quote PassMark numbers in chat freely; never write them into repo files.

## Re-checking earlier picks
For "are our old picks still cheap?": put the old SKUs into a lens called `previous`, fetch fresh details, rank them together with today's lenses, and report what changed (price path from the 30-day history, offer count, still listed or gone).
