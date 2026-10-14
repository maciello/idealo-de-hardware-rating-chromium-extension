# Entry point for agents: `just --list`.

default:
    @just --list

# Install workspace dependencies.
install:
    pnpm install

# Lint + format check, typecheck, tests, docs YAML parse.
check: lint typecheck test docs-check

lint:
    pnpm exec biome check .

# Apply Biome fixes.
fix:
    pnpm exec biome check --write .

typecheck:
    pnpm -r --if-present typecheck

test:
    pnpm exec vitest run

# Parse every YAML under docs/ (flow-mapping quoting errors recur).
docs-check:
    uv run --quiet --with pyyaml python -I -c "import glob,yaml; [yaml.safe_load(open(f)) for f in glob.glob('docs/**/*.yaml', recursive=True)]; print('docs ok')"

# Fetch PassMark CPU+GPU data into data/ (private use only, see docs/adr/0006).
fetch-passmark:
    uv run scripts/fetch_passmark.py data

# Build the extension into apps/extension/.output/chrome-mv3 (load unpacked in brave://extensions).
build:
    pnpm --filter @idealo-hw/extension build

# Build the extension and run Playwright e2e against it (headless Chromium, synthetic idealo fixtures).
e2e:
    pnpm --filter @idealo-hw/extension e2e

# Live smoke run on www.idealo.de with the private PassMark export in data/; writes e2e/artifacts/live.json. LIVE_PAGES=<comma list of idealo paths> overrides the pages.
e2e-live:
    pnpm --filter @idealo-hw/extension exec wxt build
    cd apps/extension && LIVE=1 pnpm exec playwright test --config e2e/playwright.config.ts live.spec.ts

# Extension dev server with HMR.
dev:
    pnpm --filter @idealo-hw/extension dev
