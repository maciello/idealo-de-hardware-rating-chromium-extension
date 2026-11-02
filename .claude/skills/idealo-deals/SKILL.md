---
name: idealo-deals
description: Find and rank the best deals on idealo.de for what the user wants and return a top-N with specs, scores, standout features, red flags, 30-day price context and idealo links. Laptops have a full playbook (business, gaming, video calls/webcam, travel, students, photo/video editing, developers, local AI with shared-memory chips or dedicated GPUs, PassMark CPU/GPU scores); any other idealo category (cameras, phones, monitors, headphones, TVs...) works through custom metrics and features. Use this whenever someone asks for the best/cheapest/top products or deals, which one to buy, whether earlier picks are still cheap, or wants several searches pooled into one ranking, even if they never say idealo, ranking or skill.
---

# Deals on idealo.de

You do the parts that need reading and judgment: turn the ask into wants, search idealo through its MCP, read spec sheets into a fixed form, and check the top picks for catches. `just deals` does every number: benchmark lookup, prices with shipping, 30-day price stats, hard filters, weighted score, standouts, rare features, red flags, top N. Keep that split. Hand-computed rankings drift and are hard to check; the script's report.json is the single source for every figure you quote.

## Before you start
- Tools: `mcp__idealo_de__search_products`, `get_product_details`, `get_product_offers`, `get_product_price_history`.
- Field reference: `just deals-schema` prints the exact JSON Schema for the wants and candidate files. Read it once per session; it beats any copy in prose.
- Work in the session scratchpad, e.g. `<scratchpad>/deals/<yyyy-mm-dd>/`. Everything pulled from idealo stays there; idealo MCP data is never committed (ADR 0008 in this repo).
- Laptops: PassMark files in `data/` (`just fetch-passmark`), private, never committed. If the fetch fails, use what is in `data/` and say how old it is. Other categories run without `--passmark-dir`.

## Which references to read
| Product | Read |
|---|---|
| Laptops / notebooks | `references/laptop-wants.md`, `references/laptop-lenses.md`, `references/laptop-extraction.md` |
| Anything else | `references/other-categories.md` |
| Always, before answering | `references/judgment.md` |

## Workflow

### 1. Wants → `wants.yaml`
Split the ask into hard limits (exclude), weights 0–5 (rank), must-have features (exclude) and weighted features (rank). Anything the built-in metrics do not cover becomes a custom metric (`custom_metrics` + candidate `extra`) or a feature (`features`). Pick sensible defaults instead of asking; state them in the answer. Ask only when the budget is unknown and cannot be inferred.

### 2. Plan 2–4 lenses
A lens is one search angle. Different angles surface different products: a "business + 32 GB" search never shows a creator laptop with an RTX card. Run several and pool them. Give each lens a short id and list them under `lenses:` in wants.yaml.

### 3. Search
- One discovery call per category to read `availableCategories` and `availableFilters`, then pick ids **by label** (e.g. RAM "32 GB"). Ids are not stable knowledge; labels are.
- `includeSearchFilters` needs `includeCategories`. Several values of one attribute widen (OR); values of different attributes narrow (AND).
- Use `minPrice`/`maxPrice` from the budget and `availableOnly: true`.
- One call returns 10 results. If a lens is crowded, split it (by manufacturer, model family, price band) rather than paging blindly.

### 4. Shortlist
Keep the plausible results per lens, dedupe by `nameDelta` (model number), aim for 10–20 candidates in total. Detail calls are the expensive part, and idealo traffic stays low-volume.

### 5. Details → candidate files
Call `get_product_details` per shortlisted `productRef` and fill the candidate form (laptops: `references/laptop-extraction.md`; others: `references/other-categories.md`). For more than 6 products, fan out: give each subagent (Sonnet is enough) at most 6 refs plus the brief from the extraction reference, and let it return YAML. Write one file per lens or batch, e.g. `candidates-business.yaml`. If the cheapest shown offer is above the last price-history point, a cheaper offer was not returned: call `get_product_offers`.

### 6. Rank
```
just deals rank --wants <dir>/wants.yaml --candidates <dir>/candidates-*.yaml [--passmark-dir data] --out <dir>/out
```
Pass every candidate file; the script pools them and merges duplicates across lenses. Read `out/report.md` first, then `out/report.json` for exact values.

### 7. Judgment pass on the top N
Work through `references/judgment.md`. If you correct a candidate (add a flag or a note, fix a field), re-run step 6 so the report stays the source of truth.

### 8. Answer
- Lead with the pick and its price, then a ranked table with idealo links, total price and the columns that matter for this ask.
- Laptops: the table always has CPU Mark and G3D Mark columns (write "missing" when report.json has none), plus webcam and RAM. Other categories: the custom metrics from wants.yaml.
- One short block per pick: standouts, catches, 30-day price story, best and trusted offer.
- Then a short "ruled out" table with reasons, then the recommendation.
- Numbers come from report.json or tool output only. German number format (1.207,99 €). Say when prices were fetched; idealo prices move daily.
- Plain words, no marketing language. PassMark numbers may be quoted in chat; never write them into repo files.

## Re-checking earlier picks
For "are our old picks still cheap?": put the old model numbers into a lens called `previous`, fetch fresh details, rank them with today's lenses, and report what changed: price path from the 30-day history, offer count, still listed or gone.
