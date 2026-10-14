import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The private PassMark export and idealo label lists live in the gitignored data/ dir (docs/adr/0006). Suites that
 * need them decide with `haveData` before the describe and read the files in beforeAll or a test body, never while
 * the suite is being collected, so they skip cleanly when the files are absent.
 */
const dataDir = resolve(import.meta.dirname, "../../../data");

export const dataPath = (name: string): string => resolve(dataDir, name);

export const haveData = (...names: readonly string[]): boolean =>
  names.every((name) => existsSync(dataPath(name)));
