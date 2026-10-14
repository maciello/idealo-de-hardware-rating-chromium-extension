import { useCohortPolicy } from "./controller/use-cohort-policy";
import { usePrimaryNumber } from "./controller/use-primary-number";
import { useStrategies } from "./controller/use-strategies";
import { CohortControls } from "./view/CohortControls";
import { PrimaryNumberControl } from "./view/PrimaryNumberControl";
import { StrategiesCard } from "./view/StrategiesCard";

/** Options-page card: which strategies render, plus the percentile cohort. */
export function StrategiesConnectedCard() {
  const strategies = useStrategies();
  const cohort = useCohortPolicy();
  return (
    <StrategiesCard
      strategies={strategies.strategies}
      enabledIds={strategies.enabledIds}
      onToggle={strategies.toggle}
    >
      <CohortControls
        policy={cohort.policy}
        onCutoffKind={cohort.setCutoffKind}
        onChange={cohort.update}
      />
    </StrategiesCard>
  );
}

/** Popup row: the strategy whose value is the chip's headline number. */
export function PrimaryNumberConnectedRow() {
  return <PrimaryNumberControl {...usePrimaryNumber()} />;
}
