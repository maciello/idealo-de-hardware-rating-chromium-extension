import type { CpuIdentity } from "../identity";

export type MatchResult<R> =
  | { readonly status: "matched"; readonly record: R; readonly via: "exact" | "normalized" }
  | { readonly status: "ambiguous"; readonly candidates: readonly R[] }
  | { readonly status: "no_match" };

/** Port: maps a CPU name or extracted identity to a benchmark record, or says it cannot. */
export interface Matcher<R> {
  match(query: string | CpuIdentity): MatchResult<R>;
}

export type FreeTextMatchResult<R> =
  | {
      readonly status: "matched";
      readonly record: R;
      /** "model_token": found only through a brandless model token such as "N5095" in running text. */
      readonly via: "exact" | "normalized" | "model_token";
    }
  | Exclude<MatchResult<R>, { readonly status: "matched" }>;

/** A Matcher that can also read whole listing titles, where the CPU may be named by its model token alone. */
export interface FreeTextMatcher<R> extends Matcher<R> {
  /**
   * Everything `match(text)` does; when that finds no CPU identity at all, a token mixing letters and at least
   * three digits that is the model token of exactly one single-socket record matches ("N5095-CPU").
   * A token shared by several records, or tokens naming different records, mean no_match, never ambiguous.
   */
  matchText(text: string): FreeTextMatchResult<R>;
}
