import type { DecisionCache } from "../port";
import type { RequestOptions, SystemOneClient } from "./client";

export interface JevDeciderOptions {
  /** Defaults to a `TypeSafeClient` built from `apiKey` and `baseURL`. */
  readonly client?: SystemOneClient;
  /**
   * OpenRouter API key, injected by the caller (the extension reads it from its storage). Required when
   * `client` is omitted; library code never reads the environment and never logs the key.
   */
  readonly apiKey?: string;
  /** API root without "/v1/systemone". Default: OpenRouter. Used only when `client` is omitted. */
  readonly baseURL?: string;
  /** Pinned model for every request. Default `typesafe/jev-1.13`. */
  readonly model?: string;
  /** Minimum confidence (choice) or yes-probability (filters) to accept. Default 0.7. */
  readonly threshold?: number;
  readonly cache?: DecisionCache;
  /**
   * Needed when the default client runs in a browser-like runtime (an extension service worker);
   * the key then lives in extension storage, never in a page (docs/adr/0011 key_handling).
   */
  readonly dangerouslyAllowBrowser?: boolean;
  /** Per-call timeout/retry/abort settings. The SDK's own retry and timeout apply otherwise. */
  readonly requestOptions?: RequestOptions;
  /** Estimated-token budget per request when chunking filter questions. Default 24,000. */
  readonly maxRequestTokens?: number;
}

/** Options resolved to defaults, shared by the two decider operations. */
export interface JevRuntime {
  readonly client: SystemOneClient;
  readonly model: string;
  readonly threshold: number;
  readonly cache: DecisionCache | undefined;
  readonly maxRequestTokens: number;
  readonly requestOptions: RequestOptions | undefined;
}
