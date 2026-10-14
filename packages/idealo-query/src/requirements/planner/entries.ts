/** Entries of a partial record keyed by a known union; `Object.entries` alone types the keys as `string`. */
export function entriesOf<K extends string, V>(record: Partial<Record<K, V>>): [K, V][] {
  // SAFETY: requirements records are parsed by RequirementsSchema, whose partialRecord keys are members of K and whose present values are never undefined.
  return Object.entries(record) as [K, V][];
}
