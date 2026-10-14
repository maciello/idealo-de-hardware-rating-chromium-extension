import {
  type GpuRatingInput,
  type GpuRatingStrategy,
  scoreStrategy,
  valuePerEuroStrategy,
} from "../strategy";

export const g3dScore: GpuRatingStrategy = scoreStrategy<GpuRatingInput>({
  id: "gpu_g3d_score",
  label: "G3D score",
  what: "G3D Mark",
  subject: ({ gpu }) => gpu.name,
  score: ({ gpu }) => gpu.g3dMark,
});

export const gpuValuePerEuro: GpuRatingStrategy = valuePerEuroStrategy<GpuRatingInput>({
  id: "gpu_value_per_euro",
  metric: "G3D Mark",
  score: ({ gpu }) => gpu.g3dMark,
});
