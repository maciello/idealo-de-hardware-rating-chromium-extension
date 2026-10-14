import {
  type BenchmarkSnapshot,
  type BenchmarkSource,
  passmarkCpuSource,
  passmarkGpuSource,
} from "@idealo-hw/hw-bench";
import type { z } from "zod";
import { CpuSnapshotSchema, GpuSnapshotSchema } from "../../contracts";
import { cpuSnapshotItem, gpuSnapshotItem } from "../../platform/storage";
import type { StoredItem } from "../../platform/storage/use-storage-item";
import { useBenchmarkImport } from "./controller/use-benchmark-import";
import { IMPORT_COPY } from "./copy";
import { ImportCard } from "./view/ImportCard";

interface ConnectedImportCardProps<R> {
  kind: "cpu" | "gpu";
  title: string;
  source: BenchmarkSource<R>;
  item: StoredItem<BenchmarkSnapshot<R> | null>;
  schema: z.ZodType<BenchmarkSnapshot<R>>;
}

function ConnectedImportCard<R>({ kind, title, ...input }: ConnectedImportCardProps<R>) {
  return <ImportCard kind={kind} title={title} {...useBenchmarkImport(input)} />;
}

export const CpuImportCard = () => (
  <ConnectedImportCard
    kind="cpu"
    title={IMPORT_COPY.cpuTitle}
    source={passmarkCpuSource}
    item={cpuSnapshotItem}
    schema={CpuSnapshotSchema}
  />
);

export const GpuImportCard = () => (
  <ConnectedImportCard
    kind="gpu"
    title={IMPORT_COPY.gpuTitle}
    source={passmarkGpuSource}
    item={gpuSnapshotItem}
    schema={GpuSnapshotSchema}
  />
);
