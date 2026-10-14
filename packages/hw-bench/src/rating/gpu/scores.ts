import {
  type GpuRatingInput,
  type GpuRatingStrategy,
  scoreStrategy,
  valuePerEuroStrategy,
} from "../strategy";

export const g3dScore: GpuRatingStrategy = scoreStrategy<GpuRatingInput>({
  id: "gpu_g3d_score",
  label: "G3D score",
  metric: "g3d_mark",
  subject: ({ gpu }) => gpu.name,
  score: ({ gpu }) => gpu.g3dMark,
});

export const gpuValuePerEuro: GpuRatingStrategy = valuePerEuroStrategy<GpuRatingInput>({
  id: "gpu_value_per_euro",
  name: "G3D Mark",
  metric: "g3d_mark",
  score: ({ gpu }) => gpu.g3dMark,
});
