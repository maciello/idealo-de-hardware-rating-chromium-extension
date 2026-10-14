import { formatInteger } from "../format";
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
  what: "CPU Mark (multi-thread)",
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
      strategyId: SINGLETHREADSCORE_ID,
      value: cpu.singleThreadMark,
      display: formatInteger(cpu.singleThreadMark),
      explanation: `PassMark single-thread rating of ${cpu.name}: ${formatInteger(cpu.singleThreadMark)}.`,
    };
  },
};

const VALUEPEREURO_ID = "value_per_euro";

export const valuePerEuro: RatingStrategy = valuePerEuroStrategy<RatingInput>({
  id: VALUEPEREURO_ID,
  metric: "CPU Mark",
  score: ({ cpu }) => cpu.cpuMark,
});
