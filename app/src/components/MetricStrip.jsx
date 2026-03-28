function Card({ label, value, wide }) {
  return (
    <div className={`flex flex-col justify-between px-5 py-3 border-r border-border last:border-r-0 ${wide ? 'flex-[2]' : 'flex-1'}`}>
      <span
        className="font-mono uppercase text-text-muted"
        style={{ fontSize: 12, letterSpacing: '0.1em' }}
      >
        {label}
      </span>
      <span
        className="font-mono font-500 text-accent mt-1"
        style={{ fontSize: wide ? 48 : 48 }}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

export default function MetricStrip({ data }) {
  const p12 = data?.default_prob_12m != null
    ? `${(data.default_prob_12m * 100).toFixed(1)}%` : '—'
  const p36 = data?.default_prob_36m != null
    ? `${(data.default_prob_36m * 100).toFixed(1)}%` : '—'
  const median = data?.median_survival_months != null
    ? `${data.median_survival_months} mo` : '—'
  const pct = data?.risk_percentile != null
    ? `${data.risk_percentile}th` : '—'

  return (
    <div className="flex border-b border-border bg-bg flex-shrink-0">
      <Card label="12-Month Default" value={p12} />
      <Card label="36-Month Default" value={p36} />
      <Card label="Median Survival"  value={median} />
      <Card label="Risk Percentile"  value={pct} wide />
    </div>
  )
}
