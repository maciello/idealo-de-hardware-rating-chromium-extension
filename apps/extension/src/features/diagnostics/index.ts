// The content script imports buildPageReport from here; the connected components are tree-shaken
// out of its bundle, so keep every module in this feature free of top-level side effects.
export { DiagnosticsConnectedCard, DiagnosticsConnectedRow } from "./connected";
export { buildPageReport } from "./model";
