function Card({ label, value, color, wide }) {
  return (
    <div className={`flex flex-col justify-between px-4 py-3 border-r border-border last:border-r-0 ${wide ? 'flex-[2]' : 'flex-1'}`}>
      <span className="font-mono text-2xs uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span className={`font-mono font-400 mt-1 ${wide ? 'text-4xl' : 'text-2xl'} ${color || 'text-text-primary'}`}>
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
  const p36Color = data?.default_prob_36m > 0.3
    ? 'text-risk-red'
    : data?.default_prob_36m < 0.1 ? 'text-safe-green' : 'text-text-primary'
  const median = data?.median_survival_months != null
    ? `${data.median_survival_months} mo` : '—'
  const pct = data?.risk_percentile != null
    ? `${data.risk_percentile}th` : '—'

  return (
    <div className="flex border-b border-border bg-bg flex-shrink-0">
      <Card label="12-Month Default" value={p12} />
      <Card label="36-Month Default" value={p36} color={p36Color} />
      <Card label="Median Survival"  value={median} />
      <Card label="Risk Percentile"  value={pct} wide />
    </div>
  )
}
