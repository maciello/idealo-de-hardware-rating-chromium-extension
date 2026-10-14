import type { FacetPlan } from "@idealo-hw/idealo-query";
import { REQUIREMENTS_COPY } from "../copy";

const STATUS = REQUIREMENTS_COPY.status;

/** One short line per requirement: what the plan did with it. Null when there is nothing to say. */
export function statusLine(plan: FacetPlan | undefined): string | null {
  if (plan === undefined) return null;
  if (plan.status === "not_expressible") return STATUS.notFilterable;
  const noun = STATUS.modelNouns[plan.facet];
  const cap = plan.capped && noun !== undefined ? STATUS.cap(noun) : null;
  const main =
    plan.status === "applied"
      ? `${STATUS.options(plan.selected.length)}${plan.partial.length > 0 ? STATUS.partly(plan.partial.length) : ""}`
      : plan.status === "unconstrained"
        ? STATUS.everyOption
        : STATUS.noOption;
  return cap === null ? main : STATUS.joined(main, cap);
}
