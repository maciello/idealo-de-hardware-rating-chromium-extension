# idealo Hardware Rating

A browser extension for idealo.de. It shows how fast each laptop's processor and graphics are, right in the search results, and lets you filter by "at least this fast" or "at least this much RAM" instead of ticking boxes one at a time.

<!-- Screenshot: a laptop result page with rating chips, and the open filter builder. Capture from your own browser; e2e/artifacts screenshots use synthetic data and stay out of the repo. -->

## The problem

Looking for a good laptop deal on idealo usually goes like this:

1. You tick a filter, press OK, and wait for the page to reload. A detailed search needs twenty or thirty filters, and widening a range means clicking through them again.
2. There is no "at least 16 GB RAM" filter. There is one box for 16 GB, one for 24 GB, one for 32 GB, and so on. Processors are worse: a long list of names, and nothing says which ones are fast.
3. The results don't show how good a laptop is. Two laptops both sold as "Core Ultra 7" can be far apart in speed.
4. So you open products one by one, copy the processor name, look it up on a benchmark site, note the score and go back. By the tenth candidate you are juggling numbers in your head and in a dozen tabs.
5. The things that make a laptop a bad buy sit deep in the spec sheet: 8 GB of RAM, slow eMMC storage instead of an SSD, a 720p webcam, an old Wi-Fi standard, a dim screen.

Doing this properly can take days.

## What changes

| On idealo today | With the extension |
|---|---|
| A processor name, no idea how fast it is | A rating on every product, with a bar showing where the chip ranks among laptop CPUs |
| Look up each processor on a benchmark site | The score is already there, plus its rank on the current page |
| One checkbox per RAM size, per processor | A slider: "RAM ≥ 16 GB", "Multi-thread ≥ your minimum". It selects every matching option for you |
| Each click reloads the page | Set everything in one panel, then open the result once |
| Traps hidden in the spec sheet | Red flags on the product, each with a one-line reason |

## What you see

### Rating chip

Every product tile on a listing page gets a small chip:

- the processor's multi-thread score and a bar ("top X% of laptop CPUs"), so you can tell at a glance whether a number is good;
- a graphics line with graphics memory (stated by the shop, typical for the chip, or shared with RAM);
- a tag when the laptop uses an older memory generation (DDR4);
- the number of red flags.

If the extension can't tell which processor a product has, the chip says **CPU ?** instead of guessing. If several processors could match the title, the card says so.

Click the chip for the full card: multi-thread, single-thread, score per euro, rank on this page, rank in its segment, red flags and features.

### Red flags

Each flag has a severity (red, amber or info) and a short explanation in plain words. The extension checks for:

- very little or low RAM, and outdated RAM types;
- eMMC storage, hard drive only, very little or small storage;
- low-resolution or dim screens;
- very low or very high power processors;
- old Wi-Fi, small battery, old model, USB 2 only, old video output, no operating system;
- the webcam: 1080p or better, IR camera, 720p, or none (shown under Features).

### Filter builder

A button on idealo opens the filter builder. You set requirements with sliders:

- processor: multi-thread and single-thread minimums (combined with "and" or "or");
- graphics: 3D score minimum and graphics memory;
- RAM, SSD and storage minimums, and RAM type (DDR5, LPDDR5, LPDDR5X, DDR4, LPDDR4X);
- display size, refresh rate, brightness, weight, battery life, release year;
- price range.

The builder turns each slider into idealo's own filters. "Multi-thread ≥ X" becomes a tick on every processor in idealo's list that scores at least X. Each slider tells you how many options it selected, or why it can't filter on this page. A counter shows the most products the search can return. When you press **Open**, idealo loads once with all filters applied. You can also search filters by name, sort, and reset.

Sliders only appear for filters idealo offers on the page you are on.

## Your data

- The extension reads the idealo page you have open. It makes no extra requests to idealo.
- Benchmark data comes from a file you import. It is stored in your browser and never leaves it.
- **AI matching is optional and off by default.** If the built-in matcher can't identify a processor from a product title, you can connect your own OpenRouter account. The extension then sends that title and a short list of candidate processor names to OpenRouter, where a decision model picks one. Each lookup is billed to your OpenRouter account at a fraction of a cent. The key stays in your browser and is used only by the extension's background script, never by web pages. **Disconnect** deletes it from the browser; revoke it at openrouter.ai/settings/keys.

## Install

The extension is not in the Chrome Web Store. Build it and load it yourself. It works in Chromium browsers (Brave, Chrome, Edge).

You need [Node.js](https://nodejs.org), [pnpm](https://pnpm.io) and [just](https://github.com/casey/just).

```sh
just install
just build
```

Then:

1. Open `brave://extensions` (or `chrome://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and pick `apps/extension/.output/chrome-mv3`.

## Benchmark data

The ratings use PassMark CPU Mark and G3D Mark scores. PassMark's terms restrict republishing their data, so the extension ships without it and you import your own copy:

1. Open the extension's **Settings**.
2. Drop a PassMark CPU file (.json or .csv) into the CPU import, and optionally a GPU file into the GPU import.

`just fetch-passmark` downloads both into `data/` for your own private use (needs [uv](https://docs.astral.sh/uv/)). Don't share or commit those files.

In Settings you can also choose which processors the "top X%" bar compares against (all years, since a given year, the last N years, or above a minimum score) and which number the chip shows first.

## Limits

- A score is the average of PassMark submissions for that chip. Laptops with the same processor differ with cooling and power limits.
- idealo's processor filter shows at most 100 options. Processors outside that list can't be selected, and the slider tells you when this happens.
- Graphics ratings are less reliable than processor ratings, especially for integrated graphics.
- The extension can't see what the spec sheet doesn't say: soldered vs upgradeable RAM, single-channel RAM, keyboard layout.
- Built and tested mainly on idealo.de laptop listings.

## Planned

- A deal score and price history check, to catch discounts measured against an inflated price ([#9](https://github.com/maciello/idealo-de-hardware-rating-chromium-extension/issues/9)).
- A red flag for non-German keyboard layouts ([#11](https://github.com/maciello/idealo-de-hardware-rating-chromium-extension/issues/11)).
- A webcam search shortcut in the filter builder.

## For developers

pnpm workspace, TypeScript. The extension is built with WXT and React; the logic lives in packages that don't depend on the browser, so a CLI, server or MCP tool can reuse them.

| Path | What it holds |
|---|---|
| `apps/extension` | The extension: content scripts, popup, settings, filter builder |
| `packages/hw-bench` | Benchmark import, processor and graphics matching, ratings |
| `packages/idealo-query` | Search model, idealo URL builder, requirements planner |
| `packages/idealo-page` | Reading idealo listing and product pages |
| `packages/sensors` | Red flags, power and webcam checks |
| `packages/decide` | Optional AI decision port (Jev via OpenRouter) |

`just --list` shows every command. `just check` runs lint, format, typecheck, tests, docs and module-boundary checks. `just e2e` builds the extension and runs Playwright against local idealo fixtures.

Design decisions are recorded in `docs/adr/`; `docs/manifest.yaml` indexes all docs.
