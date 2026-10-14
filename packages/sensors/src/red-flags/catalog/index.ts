import { MEMORY_RULES } from "./memory";
import type { FlagRule } from "./model";
import { PLATFORM_RULES } from "./platform";
import { SCREEN_RULES } from "./screen";

export type { FlagField, FlagRule } from "./model";

/** Every red flag, in the order their signals are reported. */
export const FLAG_RULES: readonly FlagRule[] = [
  ...SCREEN_RULES,
  ...MEMORY_RULES,
  ...PLATFORM_RULES,
];
