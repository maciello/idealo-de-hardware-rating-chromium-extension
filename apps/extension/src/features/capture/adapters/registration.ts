import { IDEALO_MATCH_PATTERNS } from "@idealo-hw/idealo-query/url/constants";

export const TAP_SCRIPT_ID = "idealo-hw-network-tap";
/** Where WXT builds `entrypoints/network-tap.content.ts` (registration: "runtime"). */
export const TAP_SCRIPT_FILE = "content-scripts/network-tap.js";
const TAP_MATCHES: string[] = [...IDEALO_MATCH_PATTERNS];

/** The slice of `chrome.scripting` used here, so tests can fake it. */
export interface ScriptingPort {
  getRegisteredContentScripts(filter: { ids: string[] }): Promise<{ id: string }[]>;
  registerContentScripts(
    scripts: {
      id: string;
      js: string[];
      matches: string[];
      world: "MAIN";
      runAt: "document_start";
      persistAcrossSessions: boolean;
    }[],
  ): Promise<void>;
  unregisterContentScripts(filter: { ids: string[] }): Promise<void>;
}

/**
 * The MAIN-world network tap patches fetch/XHR, which bot managers can detect. It therefore exists
 * only while capture mode is on: registered here, removed when it is turned off. Calls are
 * serialised, so a startup sync and a storage-change sync cannot both try to register.
 */
export function createTapRegistrar(scripting: ScriptingPort) {
  let queue: Promise<void> = Promise.resolve();

  const apply = async (enabled: boolean, fresh: boolean): Promise<void> => {
    const existing = await scripting.getRegisteredContentScripts({ ids: [TAP_SCRIPT_ID] });
    const registered = existing.length > 0;
    if (registered && (!enabled || fresh)) {
      await scripting.unregisterContentScripts({ ids: [TAP_SCRIPT_ID] });
    }
    if (enabled && (fresh || !registered)) {
      await scripting.registerContentScripts([
        {
          id: TAP_SCRIPT_ID,
          js: [TAP_SCRIPT_FILE],
          matches: TAP_MATCHES,
          world: "MAIN",
          runAt: "document_start",
          persistAcrossSessions: true,
        },
      ]);
    }
  };

  return {
    /** Makes the registration match `enabled`; `fresh` re-registers (after an extension update). */
    sync(enabled: boolean, fresh = false): Promise<void> {
      const run = queue.then(() => apply(enabled, fresh));
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
