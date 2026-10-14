import type { FacetPlan, FacetPlanStatus } from "@idealo-hw/idealo-query";
import { REQUIREMENTS_COPY } from "../copy";

const STATUS = REQUIREMENTS_COPY.status;

/** The main clause by what the plan did; a facet the category cannot express has its own line. */
const MAIN: Readonly<
  Record<Exclude<FacetPlanStatus, "not_expressible">, (plan: FacetPlan) => string>
> = {
  applied: (plan) =>
    `${STATUS.options(plan.selected.length)}${plan.partial.length > 0 ? STATUS.partly(plan.partial.length) : ""}`,
  unconstrained: () => STATUS.everyOption,
  unsatisfiable: () => STATUS.noOption,
};

/** One short line per requirement: what the plan did with it. Null when there is nothing to say. */
export function statusLine(plan: FacetPlan | undefined): string | null {
  if (plan === undefined) return null;
  if (plan.status === "not_expressible") return STATUS.notFilterable;
  const noun = STATUS.modelNouns[plan.facet];
  const cap = plan.capped && noun !== undefined ? STATUS.cap(noun) : null;
  const main = MAIN[plan.status](plan);
  return cap === null ? main : STATUS.joined(main, cap);
}
