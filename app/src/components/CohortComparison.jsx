import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { mergeCohortCurves } from '../utils/chartHelpers'

// Warm palette — no blue
const PALETTE = [
  '#1C1917', // near-black
  '#C2692A', // accent orange
  '#78716C', // warm gray
  '#8B6342', // dark tan
  '#4A6741', // olive green
  '#6B4A6B', // muted plum
  '#2D4A38', // dark forest
]

const C = { border: '#E2DDD8', muted: '#78716C' }

export default function CohortComparison({ cohorts, title }) {
  if (!cohorts?.length || cohorts.every(c => !c.curve?.length)) {
    return (
      <div className="flex items-center justify-center text-text-muted font-mono text-sm"
           style={{ height: 280 }}>
        Select a segment to compare cohorts
      </div>
    )
  }

  const data = mergeCohortCurves(cohorts)

  return (
    <div style={{ height: 280, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 20, bottom: 24, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: C.muted }}
            stroke={C.border}
            label={{ value: 'Month', position: 'insideBottom', offset: -10,
                     fontFamily: 'DM Mono', fontSize: 10, fill: C.muted }}
          />
          <YAxis
            domain={[0, 1]}
            tickCount={6}
            tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: C.muted }}
            tickFormatter={v => v.toFixed(1)}
            stroke={C.border}
            width={34}
          />
          <Tooltip
            formatter={(v, name) => [v != null ? v.toFixed(4) : '—', name]}
            contentStyle={{
              fontFamily: 'DM Mono', fontSize: 11,
              border: '1px solid #E2DDD8', background: '#F4F1EC',
            }}
          />
          <Legend wrapperStyle={{ fontFamily: 'DM Mono', fontSize: 10, paddingTop: 8 }} />
          {cohorts.map(({ label }, i) => (
            <Line
              key={label}
              type="stepAfter"
              dataKey={label}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={1.5}
              dot={false}
              connectNulls
              animationDuration={400}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
