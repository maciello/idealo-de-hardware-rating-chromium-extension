import type { CpuIdentity } from "../identity/cpu-identity";

export type MatchResult<R> =
  | { readonly status: "matched"; readonly record: R; readonly via: "exact" | "normalized" }
  | { readonly status: "ambiguous"; readonly candidates: readonly R[] }
  | { readonly status: "no_match" };

/** Port: maps a CPU name or extracted identity to a benchmark record, or says it cannot. */
export interface Matcher<R> {
  match(query: string | CpuIdentity): MatchResult<R>;
}
