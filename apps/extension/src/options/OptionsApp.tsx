import { Container, Stack, Text, Title } from "@mantine/core";
import { CpuImportCard, GpuImportCard } from "../features/benchmark-data";
import { CaptureCard } from "./CaptureCard";
import { DiagnosticsCard } from "./DiagnosticsCard";
import { OpenRouterCard } from "./OpenRouterCard";
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
        <OpenRouterCard />
        <CaptureCard />
        <DiagnosticsCard />
      </Stack>
    </Container>
  );
}
