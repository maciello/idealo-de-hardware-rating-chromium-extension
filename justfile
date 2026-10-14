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
