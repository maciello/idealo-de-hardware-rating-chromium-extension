import { Container, Stack, Text, Title } from "@mantine/core";
import { OpenRouterConnectedCard } from "../features/ai-matching";
import { CpuImportCard, GpuImportCard } from "../features/benchmark-data";
import { CaptureConnectedCard } from "../features/capture";
import { StrategiesConnectedCard } from "../features/settings";
import { DiagnosticsCard } from "./DiagnosticsCard";

export function OptionsApp() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={2}>idealo Hardware Rating</Title>
        <Text size="sm" c="dimmed">
          Benchmark data stays in this browser. Import your own PassMark export; nothing is bundled.
        </Text>
        <CpuImportCard />
        <GpuImportCard />
        <StrategiesConnectedCard />
        <OpenRouterConnectedCard />
        <CaptureConnectedCard />
        <DiagnosticsCard />
      </Stack>
    </Container>
  );
}
