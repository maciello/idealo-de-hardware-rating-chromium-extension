import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../../..");
const FORBIDDEN = /sessioninfo(?:encrypted)?/i;
const BASE64_BLOB = /[A-Za-z0-9+/=]{200,}/g;

function fixtureFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) return [];
    const path = join(dir, entry.name);
    if (!entry.isDirectory()) return path.includes(`${sep}fixtures${sep}`) ? [path] : [];
    return fixtureFiles(path);
  });
}

const files = ["apps", "packages"].flatMap((top) => fixtureFiles(join(repoRoot, top)));
const decode = (blob: string): string => Buffer.from(blob, "base64").toString("utf8");

describe("committed fixtures", () => {
  it("are found", () => {
    expect(files.map((f) => relative(repoRoot, f))).toContain(
      join("apps", "extension", "test", "fixtures", "listing.idealo-ssr.html"),
    );
  });

  it.each(files.map((file) => [relative(repoRoot, file), file]))(
    "%s carries no idealo session data, not even inside base64 payloads",
    (_name, file) => {
      const text = readFileSync(file, "utf8");
      expect(text).not.toMatch(FORBIDDEN);
      for (const blob of text.match(BASE64_BLOB) ?? []) expect(decode(blob)).not.toMatch(FORBIDDEN);
    },
  );
});
