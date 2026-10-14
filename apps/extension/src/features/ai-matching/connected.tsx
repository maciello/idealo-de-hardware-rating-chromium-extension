import { useAiTestResult } from "./controller/use-ai-test-result";
import { useOpenRouterConnection } from "./controller/use-openrouter-connection";
import { AiMatchingRow } from "./view/AiMatchingRow";
import { OpenRouterCard } from "./view/OpenRouterCard";

/** Options-page card: connect, test and disconnect, with the last test result. */
export function OpenRouterConnectedCard() {
  const connection = useOpenRouterConnection("options");
  const test = useAiTestResult();
  return (
    <OpenRouterCard
      connected={connection.status.connected}
      details={connection.details}
      error={connection.error}
      test={test}
      connecting={connection.connecting}
      testing={connection.testing}
      onConnect={connection.connect}
      onTest={connection.runTest}
      onDisconnect={connection.disconnect}
    />
  );
}

/** Popup row: connect or disconnect only. */
export function OpenRouterConnectedRow() {
  const connection = useOpenRouterConnection("popup");
  return (
    <AiMatchingRow
      connected={connection.status.connected}
      busy={connection.connecting || connection.disconnecting}
      error={connection.error}
      onConnect={connection.connect}
      onDisconnect={connection.disconnect}
    />
  );
}
