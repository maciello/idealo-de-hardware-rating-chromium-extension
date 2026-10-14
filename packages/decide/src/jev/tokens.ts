import type { FilterQuestion } from "./questions";

/** Rough token estimate, deliberately pessimistic for German text and digits. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 2.5);

/** Greedy chunks whose estimated size stays within the budget; order is preserved. */
export function chunkByTokens(
  questions: readonly FilterQuestion[],
  budget: number,
  fixedTokens: number,
): FilterQuestion[][] {
  const chunks: FilterQuestion[][] = [];
  let current: FilterQuestion[] = [];
  let used = fixedTokens;
  for (const question of questions) {
    const cost = estimateTokens(question.text) + 16;
    if (current.length > 0 && used + cost > budget) {
      chunks.push(current);
      current = [];
      used = fixedTokens;
    }
    current.push(question);
    used += cost;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
