import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type Candidate,
  CandidatesFileSchema,
  type DealReport,
  NO_BENCHMARKS,
  rankDeals,
  WantsSchema,
} from "@idealo-hw/deal-rank";
import { createBenchmarkLookup } from "./lookup";
import { renderMarkdown } from "./markdown";
import { loadSnapshots } from "./passmark";
import { readYamlFile } from "./yaml-input";

export interface RankOptions {
  wants: string;
  candidates: readonly string[];
  /** Directory with passmark_cpu and passmark_gpu files; null runs without benchmarks. */
  passmarkDir: string | null;
  out: string;
}

export interface RankResult {
  report: DealReport;
  jsonPath: string;
  markdownPath: string;
  warnings: string[];
}

export function runRank(options: RankOptions): RankResult {
  const wants = readYamlFile(options.wants, WantsSchema);
  const entries: Candidate[] = options.candidates.flatMap(
    (path) => readYamlFile(path, CandidatesFileSchema).candidates,
  );
  const snapshots = options.passmarkDir === null ? null : loadSnapshots(options.passmarkDir);
  const lookup =
    snapshots === null ? NO_BENCHMARKS : createBenchmarkLookup(snapshots.cpu, snapshots.gpu);
  const report = rankDeals(entries, wants, lookup);
  mkdirSync(options.out, { recursive: true });
  const jsonPath = join(options.out, "report.json");
  const markdownPath = join(options.out, "report.md");
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownPath, renderMarkdown(report));
  return { report, jsonPath, markdownPath, warnings: snapshots?.warnings ?? [] };
}
