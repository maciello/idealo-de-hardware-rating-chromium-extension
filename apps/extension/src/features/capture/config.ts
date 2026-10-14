/**
 * Side-effect free on purpose: WXT evaluates content-script modules at build time and the MAIN-world
 * tap imports this file, so nothing here may touch storage, React or the DOM.
 */

/** Longest response body (in characters) the tap keeps; longer bodies are cut and flagged. */
export const MAX_BODY_CHARS = 1_000_000;

/** Responses the ring buffer holds before the oldest is overwritten. */
export const RING_CAPACITY = 300;
