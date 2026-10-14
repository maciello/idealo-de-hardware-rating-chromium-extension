import { MIN_PEERS } from "../../config";
import type { PageRank } from "./types";

/** Ties share the better rank. */
export const pageRankOf = (
  cpuMark: number,
  peers: readonly { cpuMark: number }[],
): PageRank | null =>
  peers.length < MIN_PEERS
    ? null
    : { rank: 1 + peers.filter((p) => p.cpuMark > cpuMark).length, total: peers.length };
