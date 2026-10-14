import { loadOpenRouterCredentials } from "../../../platform/storage/openrouter-key";

/**
 * Port for whoever needs the OpenRouter key (the future Jev decider adapter). BACKGROUND ONLY:
 * never import this from a content script, the popup or an options page, and never re-export it
 * from a barrel.
 */
export interface KeyProvider {
  getOpenRouterKey(): Promise<string | null>;
}

/** Adapter backed by extension storage. */
export const storageKeyProvider: KeyProvider = {
  async getOpenRouterKey() {
    return (await loadOpenRouterCredentials())?.key ?? null;
  },
};
