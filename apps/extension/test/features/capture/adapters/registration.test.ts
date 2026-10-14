import { describe, expect, it } from "vitest";
import {
  createTapRegistrar,
  type ScriptingPort,
  TAP_SCRIPT_FILE,
  TAP_SCRIPT_ID,
} from "../../../../src/features/capture/adapters/registration";

function fakeScripting() {
  const registered = new Set<string>();
  const calls: string[] = [];
  const port: ScriptingPort = {
    async getRegisteredContentScripts({ ids }) {
      return ids.filter((id) => registered.has(id)).map((id) => ({ id }));
    },
    async registerContentScripts(scripts) {
      for (const script of scripts) {
        if (registered.has(script.id)) throw new Error(`Duplicate script ID '${script.id}'`);
        registered.add(script.id);
        calls.push(
          `register ${script.world} ${script.runAt} ${script.js.join(",")} ${script.matches.join(",")}`,
        );
      }
    },
    async unregisterContentScripts({ ids }) {
      for (const id of ids) registered.delete(id);
      calls.push("unregister");
    },
  };
  return { port, registered, calls };
}

describe("createTapRegistrar", () => {
  it("registers a MAIN-world document_start script only while capture is on", async () => {
    const { port, registered, calls } = fakeScripting();
    const tap = createTapRegistrar(port);
    await tap.sync(false);
    expect(registered.size).toBe(0);
    await tap.sync(true);
    expect(registered.has(TAP_SCRIPT_ID)).toBe(true);
    await tap.sync(false);
    expect(registered.size).toBe(0);
    expect(calls).toEqual([
      `register MAIN document_start ${TAP_SCRIPT_FILE} https://www.idealo.de/*`,
      "unregister",
    ]);
  });

  it("is idempotent", async () => {
    const { port, calls } = fakeScripting();
    const tap = createTapRegistrar(port);
    await tap.sync(true);
    await tap.sync(true);
    await tap.sync(false);
    await tap.sync(false);
    expect(calls).toHaveLength(2);
  });

  it("serialises overlapping syncs so the script is never registered twice", async () => {
    const { port, registered } = fakeScripting();
    const tap = createTapRegistrar(port);
    await Promise.all([tap.sync(true), tap.sync(true), tap.sync(false), tap.sync(true)]);
    expect(registered.has(TAP_SCRIPT_ID)).toBe(true);
  });

  it("re-registers on demand and keeps working after a failure", async () => {
    const { port, calls } = fakeScripting();
    const tap = createTapRegistrar({
      ...port,
      registerContentScripts: async (scripts) => {
        if (calls.length === 0 && scripts.length > 0) {
          calls.push("boom");
          throw new Error("boom");
        }
        return port.registerContentScripts(scripts);
      },
    });
    await expect(tap.sync(true)).rejects.toThrow("boom");
    await tap.sync(true);
    await tap.sync(true, true);
    expect(calls.filter((c) => c.startsWith("register"))).toHaveLength(2);
    expect(calls).toContain("unregister");
  });
});
