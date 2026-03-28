import { useModelInfo } from '../hooks/usePrediction'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'

const C = { border: '#E2DDD8', muted: '#78716C' }
const MODEL_COLORS = { cox_ph: '#1C1917', rsf: '#C2692A' }

function SectionTitle({ children }) {
  return (
    <p className="font-mono text-2xs uppercase tracking-widest text-text-muted mb-3">
      {children}
    </p>
  )
}

function MetaRow({ label, value }) {
  return (
    <>
      <span className="font-mono text-xs text-text-muted">{label}</span>
      <span className="font-mono text-xs text-text-primary">{value}</span>
    </>
  )
}

export default function ModelPerformance() {
  const { data: info, isLoading } = useModelInfo()

  if (isLoading) {
    return (
      <div className="px-6 py-6 font-mono text-sm text-text-muted animate-pulse">
        Loading model metrics…
      </div>
    )
  }

  if (!info) return null

  // C-index bar data
  const cIndexData = Object.entries(info.c_index || {}).map(([k, v]) => ({
    model: k, value: v,
  }))

  // Brier score line data
  const brierTimes = [12, 24, 36]
  const brierData  = brierTimes.map(t => {
    const row = { month: `${t}m` }
    Object.entries(info.brier_scores || {}).forEach(([k, scores]) => {
      row[k] = scores[String(t)] ?? scores[t] ?? null
    })
    return row
  })

  return (
    <div className="px-6 py-6 max-w-3xl">
      <h1 className="font-sans font-500 text-xl text-text-primary mb-6">
        Model Performance
      </h1>

      <div className="grid grid-cols-2 gap-x-10 gap-y-8">

        {/* C-index */}
        <div>
          <SectionTitle>Harrell's C-Index (discrimination)</SectionTitle>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart
              data={cIndexData}
              layout="vertical"
              margin={{ left: 8, right: 40, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis
                type="number" domain={[0.5, 1.0]} tickCount={4}
                tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: C.muted }}
                stroke={C.border}
              />
              <YAxis
                type="category" dataKey="model"
                tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: C.muted }}
                stroke={C.border} width={44}
              />
              <Tooltip
                formatter={v => v?.toFixed(4)}
                contentStyle={{ fontFamily: 'DM Mono', fontSize: 11,
                                border: '1px solid #E2DDD8', background: '#F4F1EC' }}
              />
              <Bar dataKey="value" fill="#1C1917" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="font-mono text-2xs text-text-muted mt-1">
            1.0 = perfect ranking · 0.5 = random
          </p>
        </div>

        {/* Brier score */}
        <div>
          <SectionTitle>Brier Score (calibration)</SectionTitle>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart
              data={brierData}
              margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: C.muted }}
                stroke={C.border}
              />
              <YAxis
                domain={[0, 0.3]}
                tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: C.muted }}
                tickFormatter={v => v.toFixed(2)}
                stroke={C.border} width={34}
              />
              <Tooltip
                formatter={(v, name) => [v?.toFixed(4), name]}
                contentStyle={{ fontFamily: 'DM Mono', fontSize: 11,
                                border: '1px solid #E2DDD8', background: '#F4F1EC' }}
              />
              <Legend wrapperStyle={{ fontFamily: 'DM Mono', fontSize: 10 }} />
              {Object.keys(info.brier_scores || {}).map(k => (
                <Line
                  key={k} type="monotone" dataKey={k}
                  stroke={MODEL_COLORS[k] || C.muted}
                  strokeWidth={1.5}
                  dot={{ r: 3, fill: MODEL_COLORS[k] || C.muted }}
                  animationDuration={400}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="font-mono text-2xs text-text-muted mt-1">
            Lower = better calibrated
          </p>
        </div>

      </div>

      {/* Training metadata */}
      <div className="mt-8">
        <SectionTitle>Training Details</SectionTitle>
        <div
          className="border border-border grid gap-x-8 gap-y-2 p-4"
          style={{ gridTemplateColumns: 'max-content 1fr' }}
        >
          <MetaRow label="Training rows"  value={(info.n_training_rows || 0).toLocaleString()} />
          <MetaRow label="Training date"  value={(info.training_date || '').slice(0, 10)} />
          <MetaRow label="Features"       value={info.features?.length ?? '—'} />
          <MetaRow
            label="Feature list"
            value={info.features?.join(', ') || '—'}
          />
        </div>
      </div>
    </div>
  )
}
