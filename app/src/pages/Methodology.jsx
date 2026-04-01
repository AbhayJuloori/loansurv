const SECTIONS = [
  {
    num: '01',
    title: 'Why Survival Analysis?',
    tag: 'The core idea',
    tldr: 'We model when default happens, not just whether it happens.',
    body: `Standard classification models answer "will this borrower default?" Survival analysis answers "when?" This distinction matters for portfolio management: a loan that defaults in month 3 has very different economics than one that defaults in month 33, even if both have the same 36-month default probability.

By modeling the full time-to-event distribution, we can compute probabilities at any horizon, estimate median survival time, and compare risk trajectories across segments — things logistic regression does not do directly, as it models a single binary outcome rather than a time-to-event distribution.`,
    callout: 'A survival curve doesn\'t just give you a yes/no — it gives you the full probability of default at every future month.',
  },
  {
    num: '02',
    title: 'Kaplan-Meier Estimator',
    tag: 'Non-parametric baseline',
    tldr: 'Directly measure how many loans survive each month — no assumptions needed.',
    body: `The non-parametric baseline. No assumptions about the shape of the survival function — it is estimated directly from the data. Loans that were fully paid before the observation window closed are treated as right-censored: we know they survived at least that long, but not what would have happened after.

Stratified KM curves by grade, term, and purpose reveal how default risk evolves differently across borrower segments. Log-rank tests determine whether observed differences are statistically significant — confirming that, say, Grade A and Grade F borrowers truly have different risk trajectories, not just sampling noise.`,
    callout: 'Right-censoring is a key concept: a loan paid off early doesn\'t count as "survived forever" — we simply stop tracking it at the payoff date.',
  },
  {
    num: '03',
    title: 'Cox Proportional Hazards',
    tag: 'Interpretable regression model',
    tldr: 'Quantify exactly how each borrower characteristic affects default risk — with hazard ratios.',
    body: `A semi-parametric regression model that estimates the effect of borrower features on the hazard rate — the instantaneous risk of default at each moment in time. The proportional hazards assumption (that the ratio of hazard rates between any two borrowers stays constant over time) is verified using Schoenfeld residuals. Features that violate this assumption are handled by stratification rather than exclusion.

The result is a set of hazard ratios: a DTI hazard ratio of 1.12 means each additional percentage point of DTI raises the instantaneous default hazard by 12%, holding all else equal. This is what powers the Risk Factor Impact chart — you can see exactly which features make a specific borrower more or less risky.`,
    callout: 'Hazard ratio > 1 → risk factor (pushes default earlier). Hazard ratio < 1 → protective factor (delays default). Visible in the bar chart on the Borrower Analysis page.',
  },
  {
    num: '04',
    title: 'Random Survival Forest',
    tag: 'Non-parametric ML model',
    tldr: 'Capture complex, non-linear risk interactions that regression misses.',
    body: `A non-parametric machine learning approach that extends random forests to censored survival data. Unlike Cox PH, it makes no proportional hazards assumption and naturally captures non-linear interactions — for example, high DTI may be more predictive of early default for Grade D borrowers than Grade A borrowers, an effect Cox PH would miss.

Trained on a stratified 200,000-row subsample of the full dataset to keep training tractable; the event rate is preserved in the subsample. Feature importance is estimated via permutation, showing which variables most drive the model's discrimination ability.`,
    callout: 'Both models run in parallel. Cox PH gives you interpretability (the "why"); Random Survival Forest gives you predictive power (the "how risky"). The C-index shows which discriminates better.',
  },
  {
    num: '05',
    title: 'Evaluation Metrics',
    tag: 'How we measure model quality',
    tldr: 'C-index measures ranking quality. Brier score measures probability accuracy. You need both.',
    body: `Harrell's C-index measures discrimination: the probability that, for a randomly chosen pair of borrowers where one defaults before the other, the model assigns the earlier defaulter a higher risk score. A C-index of 0.5 is random; 1.0 is perfect.

The time-dependent Brier score measures calibration at fixed time horizons (12, 24, 36 months): a well-calibrated model that predicts a 20% default probability should see roughly 20% of those borrowers default by that time. Both metrics together tell a complete story — a model can discriminate well but still be poorly calibrated, or vice versa.`,
    callout: 'A high C-index with a low Brier score means the model both ranks borrowers correctly AND gives accurate probabilities — exactly what you need for pricing or credit decisions.',
  },
]

function SectionCard({ section }) {
  return (
    <div
      className="border border-border bg-bg"
      style={{ borderRadius: 6 }}
    >
      {/* Card header */}
      <div
        className="flex items-start gap-4 px-5 py-4 border-b border-border"
        style={{ background: 'rgba(194,105,42,0.03)' }}
      >
        <span
          className="font-mono font-600 flex-shrink-0"
          style={{ fontSize: 28, lineHeight: 1, color: 'rgba(194,105,42,0.25)' }}
        >
          {section.num}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-mono font-600 text-text-primary" style={{ fontSize: 16 }}>
              {section.title}
            </h2>
            <span
              className="font-mono uppercase text-accent px-2 py-0.5 border border-current"
              style={{ fontSize: 10, letterSpacing: '0.08em', borderRadius: 3, opacity: 0.8 }}
            >
              {section.tag}
            </span>
          </div>
          <p
            className="font-sans font-500 text-text-primary mt-1.5"
            style={{ fontSize: 14, lineHeight: 1.4 }}
          >
            {section.tldr}
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        {section.body.split('\n\n').map((para, i) => (
          <p
            key={i}
            className="font-sans text-text-muted leading-relaxed"
            style={{ fontSize: 14, lineHeight: 1.7, marginBottom: i < section.body.split('\n\n').length - 1 ? 12 : 0 }}
          >
            {para}
          </p>
        ))}

        {/* Key insight callout */}
        {section.callout && (
          <div
            className="mt-4 border-l-2 pl-4 py-1"
            style={{ borderColor: '#C2692A', background: 'rgba(194,105,42,0.04)', borderRadius: '0 4px 4px 0' }}
          >
            <p
              className="font-sans font-500 text-text-primary"
              style={{ fontSize: 13, lineHeight: 1.55 }}
            >
              {section.callout}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Methodology() {
  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px 48px' }}>

      {/* Page header */}
      <div className="mb-8">
        <p className="font-mono uppercase text-accent mb-1" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
          Methodology
        </p>
        <h1 className="font-mono font-700 text-text-primary mb-3" style={{ fontSize: 26, lineHeight: 1.2 }}>
          How LoanSurv Works
        </h1>
        <p className="font-sans text-text-muted" style={{ fontSize: 15, lineHeight: 1.65, maxWidth: 620 }}>
          A plain-English guide to survival analysis for loan default prediction —
          from the math behind the curves to what the numbers actually mean for a portfolio.
          No statistics background needed.
        </p>

        {/* Concept summary strip */}
        <div className="flex gap-0 mt-6 border border-border overflow-hidden" style={{ borderRadius: 4 }}>
          {[
            ['Kaplan-Meier', 'measure survival from data'],
            ['Cox PH', 'quantify feature effects'],
            ['Survival Forest', 'non-linear risk interactions'],
            ['C-index + Brier', 'measure model quality'],
          ].map(([name, desc], i, arr) => (
            <div
              key={name}
              className={`flex-1 px-4 py-3 ${i < arr.length - 1 ? 'border-r border-border' : ''}`}
              style={{ background: i % 2 === 0 ? '#FAF8F5' : '#F4F1EC' }}
            >
              <p className="font-mono font-600 text-text-primary" style={{ fontSize: 12 }}>{name}</p>
              <p className="font-sans text-text-muted mt-0.5" style={{ fontSize: 11 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section cards */}
      <div className="flex flex-col gap-4">
        {SECTIONS.map(section => (
          <SectionCard key={section.num} section={section} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-5 border-t border-border flex items-center gap-5 flex-wrap">
        <a
          href="https://github.com/abhayjuloori/loansurv"
          className="font-mono text-accent transition-all duration-150 hover:underline"
          style={{ fontSize: 13 }}
          target="_blank" rel="noreferrer"
        >
          GitHub →
        </a>
        <span className="font-sans text-text-muted" style={{ fontSize: 13 }}>
          Data: Lending Club 2007–2018 · 1.8M loans · Cox PH + Random Survival Forest
        </span>
      </div>
    </div>
  )
}
