import { RATINGS_COPY } from "../../copy";
import type { SignalsCardView } from "../../view-model";

/** The card's product sections: the flags worst first, then the features; an empty one is absent. */
export function SignalsCardSections({ signals }: { signals: SignalsCardView }) {
  const { flags, features } = signals;
  return (
    <>
      {flags.length > 0 && (
        <div data-testid="card-flags">
          <div className="hw-card__head">
            <div className="hw-card__title">{RATINGS_COPY.flagsHeading}</div>
          </div>
          <ul className="hw-card__rows hw-flags">
            {flags.map((flag) => (
              <li
                key={flag.id}
                data-flag-id={flag.id}
                data-severity={flag.severity}
                title={flag.title}
              >
                <div className="hw-flag__main">
                  <span className="hw-flag__severity">{flag.severityLabel}</span>
                  <span className="hw-flag__label">{flag.label}</span>
                </div>
                <div className="hw-flag__detail">{flag.detail}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {features.length > 0 && (
        <div className="hw-card__features" data-testid="card-features">
          <span className="hw-card__features-title">{RATINGS_COPY.featuresHeading}</span>
          <ul className="hw-features">
            {features.map((feature) => (
              <li key={feature.id} data-feature-id={feature.id} title={feature.title}>
                {feature.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
