import { passmarkCpuSource, passmarkGpuSource } from "@idealo-hw/hw-bench";
import { Container, Stack, Text, Title } from "@mantine/core";
import { cpuSnapshotItem, gpuSnapshotItem } from "../storage/items";
import { CpuSnapshotSchema, GpuSnapshotSchema } from "../storage/schemas";
import { CaptureCard } from "./CaptureCard";
import { DiagnosticsCard } from "./DiagnosticsCard";
import { ImportCard } from "./ImportCard";
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
        <ImportCard
          kind="cpu"
          title="PassMark CPU data"
          source={passmarkCpuSource}
          item={cpuSnapshotItem}
          schema={CpuSnapshotSchema}
        />
        <ImportCard
          kind="gpu"
          title="PassMark GPU data"
          source={passmarkGpuSource}
          item={gpuSnapshotItem}
          schema={GpuSnapshotSchema}
        />
        <StrategiesCard />
        <OpenRouterCard />
        <CaptureCard />
        <DiagnosticsCard />
      </Stack>
    </Container>
  );
}
