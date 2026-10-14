// Module-boundary rules, see docs/adr/0014-module-boundaries-and-idealo-page.yaml.
// Severity "warn" marks rules for the target layout (features/, platform/, ui/, contracts/) and
// barrel rules the current tree still violates; later refactor steps flip them to "error".

const EXT = "^apps/extension/";
const SRC = `${EXT}src/`;
const FEATURES = `${SRC}features/`;
const UI_RUNTIME = "node_modules/(wxt|@wxt-dev|@webext-core|react|react-dom|@mantine)/";
// Current location first, target location (features/) second.
const SECRET_MODULES = `${SRC}(platform/storage/openrouter-key|ai/key-provider|features/ai-matching/background/key-provider)\\.ts$`;
const EXTENSION_RUNTIME = "node_modules/(wxt|@wxt-dev|@webext-core)/";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // R1
    {
      name: "no-circular",
      comment:
        "Import cycles hide a missing abstraction. Known cycles are listed in the refactor plan and fixed by later steps.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    // R2
    {
      name: "no-orphans",
      comment:
        "A module nobody imports is dead code (entrypoints, typings, configs and tests excepted).",
      severity: "error",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)entrypoints/",
          "(^|/)[^/]+\\.config\\.(c|m)?[jt]s$",
          "(^|/)test/",
          "(^|/)e2e/",
        ],
      },
      to: {},
    },
    // R3
    {
      name: "not-to-unresolvable",
      comment:
        "Every import must resolve. Vite query suffixes ?raw and ?inline are resolved by the bundler.",
      severity: "error",
      from: {},
      to: { couldNotResolve: true, pathNot: "\\?(raw|inline)$" },
    },
    // R4
    {
      name: "packages-not-to-apps",
      comment: "Packages are the reusable core; apps depend on them, never the reverse.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    // R5
    {
      name: "pure-packages-no-platform",
      comment: "IO-free packages must not touch extension, UI or framework runtimes (adr.0005).",
      severity: "error",
      from: { path: "^packages/(hw-bench|idealo-query|decide|sensors)/src/" },
      to: { path: UI_RUNTIME },
    },
    {
      name: "sensors-not-to-hw-bench",
      comment:
        "Sensors take plain input; the extension maps benchmark records onto it (docs/adr/0015).",
      severity: "error",
      from: { path: "^packages/sensors/" },
      to: { path: ["^packages/hw-bench/", "node_modules/@idealo-hw/hw-bench/"] },
    },
    {
      name: "sdk-only-in-jev-client",
      comment:
        "The Typesafe AI SDK is the LLM wire adapter and lives in decide/src/jev/client.ts only.",
      severity: "error",
      from: { path: "^packages/", pathNot: "^packages/decide/src/jev/client\\.ts$" },
      to: { path: "node_modules/@typesafe-ai/sdk" },
    },
    // R6
    {
      name: "idealo-page-no-platform",
      comment: "The idealo-page package reads markup only: no extension, UI or framework runtimes.",
      severity: "error",
      from: { path: "^packages/idealo-page/src/" },
      to: { path: UI_RUNTIME },
    },
    // R7
    {
      name: "package-submodules-via-barrel",
      comment: "Inside a package, sub-domains are imported through their index.ts.",
      severity: "error",
      from: { path: "^packages/([^/]+)/src/([^/]+)/" },
      to: {
        path: "^packages/$1/src/([^/]+)/.+",
        pathNot: ["^packages/$1/src/$2/", "^packages/[^/]+/src/[^/]+/index\\.ts$"],
      },
    },
    {
      name: "cross-feature-via-index",
      comment: "A feature reaches another feature only through features/<x>/index.ts.",
      severity: "warn",
      from: { path: `${FEATURES}([^/]+)/` },
      to: {
        path: `${FEATURES}([^/]+)/.+`,
        pathNot: [`${FEATURES}$1/`, `${FEATURES}[^/]+/index\\.ts$`],
      },
    },
    // R8
    {
      name: "app-screens-via-feature-index",
      comment: "Screens and entrypoints compose features through their public index only.",
      severity: "warn",
      from: { path: `^apps/extension/(src/app|entrypoints)/` },
      to: {
        path: `${FEATURES}[^/]+/.+`,
        pathNot: `${FEATURES}[^/]+/(index|background/index)\\.ts$`,
      },
    },
    {
      name: "view-is-pure",
      comment:
        "Views take props and emit callbacks: no controllers, adapters, platform or IO runtimes.",
      severity: "warn",
      from: { path: "/features/[^/]+/view/" },
      to: {
        path: [
          "/features/[^/]+/(controller|adapters|background)/",
          `${SRC}platform/`,
          EXTENSION_RUNTIME,
        ],
      },
    },
    {
      name: "model-is-pure",
      comment: "Model and view-model are pure: no UI, IO, platform or framework runtimes.",
      severity: "warn",
      from: { path: "/features/[^/]+/(model|view-model)/" },
      to: {
        path: [
          "/features/[^/]+/(controller|adapters|view|background)/",
          `${SRC}(platform|ui)/`,
          UI_RUNTIME,
        ],
      },
    },
    {
      name: "platform-not-to-features-or-ui",
      comment: "Platform adapters sit below features and UI.",
      severity: "error",
      from: { path: `${SRC}platform/` },
      to: { path: `${SRC}(features|ui|app)/` },
    },
    {
      name: "ui-not-to-features-or-platform",
      comment: "Shared UI knows neither features nor platform.",
      severity: "error",
      from: { path: `${SRC}ui/` },
      to: { path: `${SRC}(features|platform|app)/` },
    },
    {
      name: "contracts-pure",
      comment: "Contracts are zod schemas and types only.",
      severity: "error",
      from: { path: `${SRC}contracts/` },
      to: { path: [`${SRC}(features|platform|ui|app)/`, UI_RUNTIME] },
    },
    // R9
    {
      name: "secret-unreachable-from-ui-entrypoints",
      comment:
        "The OpenRouter key must be unreachable (transitively) from content scripts, popup and options.",
      severity: "error",
      from: { path: `${EXT}entrypoints/(.+\\.content\\.ts|popup/|options/)` },
      to: {
        reachable: true,
        path: `${SECRET_MODULES}`,
      },
    },
    // R10
    {
      name: "main-world-tap-is-lean",
      comment: "The MAIN-world network tap must not pull in storage, React, Mantine or shared UI.",
      severity: "warn",
      from: { path: `${EXT}entrypoints/network-tap\\.content\\.ts$` },
      to: {
        reachable: true,
        path: ["node_modules/(@wxt-dev/storage|react|react-dom|@mantine)/", `${SRC}ui/`],
      },
    },
    // R11
    {
      name: "src-not-to-tests",
      comment: "Production code must not import tests or e2e helpers.",
      severity: "error",
      from: { path: "/src/" },
      to: { path: "/(test|e2e)/" },
    },
    // R12
    {
      name: "no-non-package-json",
      comment: "Every dependency must be declared in the importing package's package.json.",
      severity: "error",
      from: {},
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: [
        "(^|/)\\.output/",
        "(^|/)\\.wxt/",
        "^data/",
        "(^|/)dist/",
        "(^|/)node_modules/",
        "(^|/)\\.probe/",
      ],
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "types", "default"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
