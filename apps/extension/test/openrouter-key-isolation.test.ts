import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const SECRET_MODULES = ["src/platform/storage/openrouter-key", "src/ai/key-provider"].map((m) =>
  resolve(root, m),
);

const resolveModule = (from: string, spec: string): string | undefined => {
  const base = resolve(dirname(from), spec);
  return [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")].find(
    (candidate) => existsSync(candidate) && /\.(ts|tsx)$/.test(candidate),
  );
};

/** Every relative module reachable from `entry`, including type-only imports (conservative). */
function reachable(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/(?:from|import)\s*\(?\s*["'](\.[^"']*)["']/g)) {
      const target = resolveModule(file, match[1] ?? "");
      if (target) queue.push(target);
    }
  }
  return seen;
}

describe("OpenRouter key isolation", () => {
  const entrypoints = readdirSync(resolve(root, "entrypoints"));
  const contentScripts = entrypoints.filter((name) => /\.content\.tsx?$/.test(name));

  it("finds the content scripts it is meant to guard", () => {
    expect(contentScripts.length).toBeGreaterThan(0);
  });

  it.each(contentScripts)("%s cannot reach the key module or the key provider", (name) => {
    const modules = [...reachable(resolve(root, "entrypoints", name))].map((f) =>
      f.replace(/\.tsx?$/, ""),
    );
    for (const secret of SECRET_MODULES) expect(modules).not.toContain(secret);
  });

  it("the options UI cannot reach the key module or the key provider", () => {
    const modules = [...reachable(resolve(root, "entrypoints/options/main.tsx"))].map((f) =>
      f.replace(/\.tsx?$/, ""),
    );
    for (const secret of SECRET_MODULES) expect(modules).not.toContain(secret);
  });
});
