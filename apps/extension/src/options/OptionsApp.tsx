import { Container, Stack, Text, Title } from "@mantine/core";
import { OpenRouterConnectedCard } from "../features/ai-matching";
import { CpuImportCard, GpuImportCard } from "../features/benchmark-data";
import { CaptureConnectedCard } from "../features/capture";
import { DiagnosticsCard } from "./DiagnosticsCard";
import { StrategiesCard } from "./StrategiesCard";

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
        <StrategiesCard />
        <OpenRouterConnectedCard />
        <CaptureConnectedCard />
        <DiagnosticsCard />
      </Stack>
    </Container>
  );
}
