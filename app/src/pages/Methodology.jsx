const SECTIONS = [
  {
    title: 'Why Survival Analysis?',
    body:  `Standard classification models answer "will this borrower default?" Survival analysis answers "when?" This distinction matters for portfolio management: a loan that defaults in month 3 has very different economics than one that defaults in month 33, even if both have the same 36-month default probability. By modeling the full time-to-event distribution, we can compute probabilities at any horizon, estimate median survival time, and compare risk trajectories across segments — none of which logistic regression can do natively.`,
  },
  {
    title: 'Kaplan-Meier Estimator',
    body:  `The non-parametric baseline. No assumptions about the shape of the survival function — it is estimated directly from the data. Loans that were fully paid before the observation window closed are treated as right-censored: we know they survived at least that long, but not what would have happened after. Stratified KM curves by grade, term, and purpose reveal how default risk evolves differently across borrower segments. Log-rank tests determine whether observed differences are statistically significant.`,
  },
  {
    title: 'Cox Proportional Hazards',
    body:  `A semi-parametric regression model that estimates the effect of borrower features on the hazard rate — the instantaneous risk of default at each moment in time. The proportional hazards assumption (that the ratio of hazard rates between any two borrowers stays constant over time) is verified using Schoenfeld residuals. Features that violate this assumption are handled by stratification rather than exclusion. The result is a set of hazard ratios: a DTI hazard ratio of 1.12 means each additional percentage point of DTI raises the instantaneous default hazard by 12%, holding all else equal.`,
  },
  {
    title: 'Random Survival Forest',
    body:  `A non-parametric machine learning approach that extends random forests to censored survival data. Unlike Cox PH, it makes no proportional hazards assumption and naturally captures non-linear interactions — for example, high DTI may be more predictive of early default for Grade D borrowers than Grade A borrowers. Trained on a stratified 200,000-row subsample of the full dataset to keep training tractable; the event rate is preserved in the subsample. Feature importance is estimated via permutation, showing which variables drive the model's discrimination.`,
  },
  {
    title: 'Evaluation Metrics',
    body:  `Harrell's C-index measures discrimination: the probability that, for a randomly chosen pair of borrowers where one defaults before the other, the model assigns the earlier defaulter a higher risk score. A C-index of 0.5 is random; 1.0 is perfect. The time-dependent Brier score measures calibration at fixed time horizons (12, 24, 36 months): a well-calibrated model that predicts a 20% default probability should see roughly 20% of those borrowers default by that time. Both metrics together tell a complete story — a model can discriminate well but still be poorly calibrated, or vice versa.`,
  },
]

export default function Methodology() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-sans font-500 text-2xl text-text-primary mb-2">
        Methodology
      </h1>
      <p className="font-sans font-300 text-base text-text-muted mb-10">
        A plain-English guide to how LoanSurv works and why survival analysis
        is the right tool for loan default timing.
      </p>

      <div className="flex flex-col gap-8">
        {SECTIONS.map(({ title, body }) => (
          <section key={title}>
            <h2 className="font-sans font-500 text-base text-text-primary mb-2">
              {title}
            </h2>
            <p className="font-sans font-300 text-base text-text-muted leading-relaxed">
              {body}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-border flex gap-5">
        <a
          href="https://github.com/abhayjuloori/loansurv"
          className="font-mono text-xs text-accent transition-all duration-150 hover:underline"
          target="_blank" rel="noreferrer"
        >
          GitHub →
        </a>
        <span className="font-mono text-xs text-text-muted">
          Data: Lending Club 2007–2018 · 1.8M loans
        </span>
      </div>
    </div>
  )
}
