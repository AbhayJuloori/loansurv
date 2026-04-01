const RISK_THRESHOLDS = {
  low: 0.08,
  medium: 0.18,
}

function riskColor(prob) {
  if (prob == null) return '#1C1917'
  if (prob <= RISK_THRESHOLDS.low) return '#16A34A'
  if (prob <= RISK_THRESHOLDS.medium) return '#C2692A'
  return '#DC2626'
}

function Card({ label, sublabel, value, valueColor, wide }) {
  return (
    <div className={`flex flex-col justify-center px-5 py-3 border-r border-border last:border-r-0 ${wide ? 'flex-[1.5]' : 'flex-1'}`}>
      <div className="flex flex-col gap-0.5 mb-1">
        <span
          className="font-mono uppercase text-text-muted"
          style={{ fontSize: 11, letterSpacing: '0.1em' }}
        >
          {label}
        </span>
        {sublabel && (
          <span className="font-sans text-text-muted" style={{ fontSize: 11, opacity: 0.75 }}>
            {sublabel}
          </span>
        )}
      </div>
      <span
        className="font-mono font-600"
        style={{ fontSize: 36, lineHeight: 1, color: valueColor || '#1C1917' }}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

export default function MetricStrip({ data }) {
  const raw12 = data?.default_prob_12m
  const raw36 = data?.default_prob_36m

  const p12 = raw12 != null ? `${(raw12 * 100).toFixed(1)}%` : '—'
  const p36 = raw36 != null ? `${(raw36 * 100).toFixed(1)}%` : '—'
  const rawMedian = data?.median_survival_months
  const median = rawMedian != null
    ? (rawMedian > 60 ? '>60 mo' : `${rawMedian} mo`)
    : '—'
  const pct = data?.risk_percentile != null
    ? `${data.risk_percentile}th` : '—'

  return (
    <div className="flex border-b border-border bg-bg flex-shrink-0">
      <Card
        label="12-Month Default"
        sublabel="Probability of default within 1 year"
        value={p12}
        valueColor={riskColor(raw12)}
      />
      <Card
        label="36-Month Default"
        sublabel="Probability of default within 3 years"
        value={p36}
        valueColor={riskColor(raw36)}
      />
      <Card
        label="Median Survival"
        sublabel="Month at which cumulative default hits 50%"
        value={median}
      />
      <Card
        label="Risk Percentile"
        sublabel={`Riskier than ${data?.risk_percentile ?? '—'}% of borrowers in the training portfolio`}
        value={pct}
        wide
      />
    </div>
  )
}
