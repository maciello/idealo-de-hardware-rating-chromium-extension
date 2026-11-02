import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const fixture = (...parts: string[]): string =>
  resolve(import.meta.dirname, "fixtures", ...parts);

/** A fresh output directory under the OS temp dir. */
export const tempOut = (): string => join(mkdtempSync(join(tmpdir(), "deal-cli-")), "out");
