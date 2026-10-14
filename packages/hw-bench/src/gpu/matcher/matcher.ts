import type { BenchmarkSnapshot, GpuBenchmarkRecord } from "../../benchmark";
import {
  extractGpuIdentity,
  looseGpuNameKey,
  normalizeGpuName,
  quadroWithoutMobileSuffix,
} from "../identity";
import { resolveGroup } from "./resolve";
import { asResult } from "./result";
import { buildGpuTables } from "./tables";
import type { GpuMatcher } from "./types";

/**
 * Builds the lookup tables once (see `buildGpuTables`). Lookup order: identity key with memory, identity key
 * (see `resolveGroup` for the variant policy), then the whole normalized name. Never fuzzy.
 */
export function createGpuMatcher(snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>): GpuMatcher {
  const tables = buildGpuTables(snapshot.records);
  const { byName, byLooseName } = tables;

  return {
    match(query, options) {
      const formFactor = options?.formFactor ?? "unknown";
      const identity = typeof query === "string" ? extractGpuIdentity(query) : query;
      // Text with extra words ("RTX 3050 OEM") is first tried as a whole PassMark name, so decorated
      // records are not swallowed by the plain model's group.
      if (typeof query === "string" && identity?.residual) {
        const named = byName.get(normalizeGpuName(query));
        if (named !== undefined) return asResult(named, query);
      }
      if (identity !== null) {
        const group = resolveGroup(tables, query, identity, formFactor);
        if (group !== null) return asResult(group.records, query, group.unsure);
      }
      if (typeof query !== "string") return { status: "no_match" };
      const byWord = byName.get(normalizeGpuName(query)) ?? byLooseName.get(looseGpuNameKey(query));
      if (byWord !== undefined) return asResult(byWord, query);
      const unsuffixed = quadroWithoutMobileSuffix(query);
      if (unsuffixed === null || formFactor === "desktop") return { status: "no_match" };
      // Mobile "M" omitted by PassMark: only a card PassMark files under Mobile and not under Desktop.
      const mobile = (byName.get(unsuffixed) ?? []).filter(
        (r) => r.segments.includes("mobile") && !r.segments.includes("desktop"),
      );
      return asResult(mobile, query);
    },
  };
}
