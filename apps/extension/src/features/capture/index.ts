// UI only (pulls React and storage). Entrypoints that must stay lean import their adapter directly:
// background/index.ts for the service worker, adapters/tap.ts for the MAIN-world tap and
// adapters/relay.ts for the isolated-world relay.
export { CaptureConnectedCard, CaptureConnectedRow } from "./connected";
