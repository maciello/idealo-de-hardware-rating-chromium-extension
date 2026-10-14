export const AI_COPY = {
  cardTitle: "AI matching (OpenRouter / Jev)",
  rowLabel: "AI matching",
  connected: "Connected",
  notConnected: "Not connected",
  description:
    "Optional. Connect your OpenRouter account so the extension can ask the Jev decision model to resolve titles the built-in matcher cannot. You approve access on openrouter.ai; the resulting API key is stored in this browser and only used by the extension background.",
  details: (userId: string | null, connectedAt: string) =>
    `Account ${userId}, connected ${connectedAt}`,
  testTitle: (at: string) => `AI test, ${at}`,
  testWorking: (picked: string | null, latencyMs: number, model: string | null) =>
    `Working: picked ${picked} in ${latencyMs} ms, model ${model}`,
  testFailed: (error: string | null) => `Failed: ${error}`,
  connect: "Connect OpenRouter",
  test: "Test AI matching",
  disconnect: "Disconnect",
  disconnectNote:
    "Disconnect deletes the key from this browser only. To revoke it, delete the key at openrouter.ai/settings/keys.",
  backgroundSilent: "The extension background did not respond. Reload the extension and try again.",

  // Messages produced by the background (connect flow and probe), shown by the views.
  cancelled: "Authorization was cancelled. Nothing changed.",
  launchFailed: "The OpenRouter sign-in window could not open.",
  extensionOnly: "Only the extension's own pages may do this.",
  probeNotConnected: "OpenRouter is not connected.",
  noConfidentPick: (confidence: string) => `No confident pick (confidence ${confidence}).`,
  pickedWrong: (picked: string, expected: string) => `Picked ${picked}, expected ${expected}.`,
} as const;
