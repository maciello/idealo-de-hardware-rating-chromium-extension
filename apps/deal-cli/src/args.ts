import { parseArgs } from "node:util";
import type { RankOptions } from "./run";

const USAGE = `Usage:
  deals rank --wants W.yaml --candidates A.yaml [--candidates B.yaml ...] [--passmark-dir DIR] --out OUTDIR
  deals schema`;

export type Command = { name: "rank"; options: RankOptions } | { name: "schema" };

/** Parses argv (without node and script) into a command; throws a message-only Error on bad input. */
export function parseCommand(argv: readonly string[]): Command {
  const [name, ...rest] = argv;
  if (name === "schema") return { name };
  if (name !== "rank") throw new Error(USAGE);
  const { values } = parseArgs({
    args: [...rest],
    options: {
      wants: { type: "string" },
      candidates: { type: "string", multiple: true },
      "passmark-dir": { type: "string" },
      out: { type: "string" },
    },
    strict: true,
  });
  const candidates = values.candidates ?? [];
  if (values.wants === undefined || candidates.length === 0 || values.out === undefined) {
    throw new Error(`--wants, at least one --candidates and --out are required.\n${USAGE}`);
  }
  return {
    name,
    options: {
      wants: values.wants,
      candidates,
      passmarkDir: values["passmark-dir"] ?? null,
      out: values.out,
    },
  };
}
