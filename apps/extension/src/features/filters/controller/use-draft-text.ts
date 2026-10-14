import { useState } from "react";

/**
 * Raw text for an input bound to a value the model stores canonically (trimmed). The draft is shown while its trimmed
 * form still equals the stored value, so a typed trailing space survives the round trip; any other change to the
 * stored value (reset, reload from the page) replaces the draft.
 */
export function useDraftText(
  stored: string | undefined,
): [shown: string, setDraft: (text: string) => void] {
  const [draft, setDraft] = useState("");
  const canonical = stored ?? "";
  return [draft.trim() === canonical ? draft : canonical, setDraft];
}
