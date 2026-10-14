# anti-slop Oxlint plugin (vendored)

## Source

- Bundle: the `install-anti-slop` skill, `assets/anti-slop`, copied with the skill's `scripts/install.mjs`.
- Copyright holder (see `LICENSE`, MIT): Dillon Mulroy.
- Upstream repository and commit: unknown. The bundle carries no revision; only the content below identifies it.
- Content identity: sha256 over `sha256sum` of every file below this directory except `LICENSE` and `UPSTREAM.md`, sorted by relative path: `0cf349cd166067381b6e2dd849b7ba3e89a0866bd6e41e46f6bc7d74d6352f93`.
- Nested provenance of the vendored padding rule: `vendor/eslint-stylistic/UPSTREAM.md`.

## Installed

- Plugin entry: `tools/oxlint/anti-slop/index.ts`, registered as `anti-slop` in `.oxlintrc.json` (`jsPlugins`).
- `oxlint` and `@oxlint/plugins` are pinned to the same exact version in the root `package.json`.
- Rules enabled and rejected, with reasons and hit counts: `docs/adr/0017-anti-slop-oxlint-subset.yaml`.

## Deviations from the bundle

- `effect/` was not copied: the repository does not depend on `effect`.
- `LICENSE` is the skill's MIT license, added at this level next to the entry point.
- Rule sources are unmodified and excluded from Biome (`biome.json`), so they keep their own style.

## Updating

Follow the skill's update procedure. This tree is the pristine bundle minus `effect/`, so it is the recoverable base for a three-way merge.
