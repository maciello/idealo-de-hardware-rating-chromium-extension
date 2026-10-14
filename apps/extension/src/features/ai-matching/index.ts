// No export from ./background: the service worker imports background/index.ts directly, and the
// OpenRouter key modules stay out of every barrel (see test/openrouter-key-isolation.test.ts).
export { OpenRouterConnectedCard, OpenRouterConnectedRow } from "./connected";
