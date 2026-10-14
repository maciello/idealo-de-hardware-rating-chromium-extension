/** Globals the specs plant in a page or the service worker and read back through `evaluate`. */
declare global {
  interface Window {
    /** Tile rectangles and page height captured at DOMContentLoaded, before any chip mounts. */
    __before?: { rects: number[][]; height: number };
    /** Filter payload the listing fixture's own script stores from its fetch. */
    __filters?: unknown;
  }
  /** Authorization URLs the stubbed `chrome.identity.launchWebAuthFlow` was called with. */
  var __authCalls: string[] | undefined;
}

export {};
