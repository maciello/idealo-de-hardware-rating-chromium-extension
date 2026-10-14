import {
  type Rating,
  type RatingInput,
  type RatingStrategy,
  scoreStrategy,
  valuePerEuroStrategy,
} from "../strategy";

const MULTITHREADSCORE_ID = "raw_multithread_score";

export const multiThreadScore: RatingStrategy = scoreStrategy<RatingInput>({
  id: MULTITHREADSCORE_ID,
  label: "Multi-thread score",
  metric: "cpu_mark",
  subject: ({ cpu }) => cpu.name,
  score: ({ cpu }) => cpu.cpuMark,
});

const SINGLETHREADSCORE_ID = "single_thread_score";

export const singleThreadScore: RatingStrategy = {
  id: SINGLETHREADSCORE_ID,
  label: "Single-thread score",
  rate({ cpu }): Rating | null {
    if (cpu.singleThreadMark === null) return null;
    return {
      kind: "score",
      strategyId: SINGLETHREADSCORE_ID,
      value: cpu.singleThreadMark,
      metric: "cpu_single",
      subject: cpu.name,
    };
  },
};

const VALUEPEREURO_ID = "value_per_euro";

export const valuePerEuro: RatingStrategy = valuePerEuroStrategy<RatingInput>({
  id: VALUEPEREURO_ID,
  name: "CPU Mark",
  metric: "cpu_mark",
  score: ({ cpu }) => cpu.cpuMark,
});
