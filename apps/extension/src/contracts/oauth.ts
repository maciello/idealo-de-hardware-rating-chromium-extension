import type { OpenRouterStatus } from "./openrouter-status";

export type OAuthErrorKind =
  | "cancelled"
  | "denied"
  | "missing_code"
  | "invalid_callback"
  | "launch_failed"
  | "exchange_network"
  | "exchange_http"
  | "exchange_invalid";

export interface OAuthError {
  kind: OAuthErrorKind;
  /** Human-readable and safe to show: never contains the authorization code or the key. */
  message: string;
}

/** What the background reports to the options page. Never carries the key. */
export type ConnectResult =
  | { ok: true; status: OpenRouterStatus }
  | { ok: false; error: OAuthError };
