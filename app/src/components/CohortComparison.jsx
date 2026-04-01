import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Label,
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

const X_TICKS = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60]

export default function CohortComparison({ cohorts }) {
  if (!cohorts?.length || cohorts.every(c => !c.curve?.length)) {
    return (
      <div className="flex items-center justify-center text-text-muted font-mono"
           style={{ height: 400, fontSize: 13 }}>
        No data available for this segment
      </div>
    )
  }

  const data = mergeCohortCurves(cohorts)

  return (
    <div style={{ height: 400, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 24, bottom: 44, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
          <XAxis
            dataKey="month"
            type="number"
            domain={[0, 60]}
            ticks={X_TICKS}
            tickFormatter={v => v === 0 ? '0' : `${v}`}
            tick={{ fontFamily: 'DM Mono', fontSize: 12, fill: C.muted }}
            stroke={C.border}
          >
            <Label
              value="Months since origination"
              position="insideBottom"
              offset={-28}
              style={{ fontFamily: 'DM Mono', fontSize: 11, fill: C.muted }}
            />
          </XAxis>
          <YAxis
            domain={[0, 1]}
            tickCount={6}
            tick={{ fontFamily: 'DM Mono', fontSize: 12, fill: C.muted }}
            tickFormatter={v => v.toFixed(1)}
            stroke={C.border}
            width={56}
          >
            <Label
              value="P(no default)"
              angle={-90}
              position="insideLeft"
              offset={16}
              style={{ fontFamily: 'DM Mono', fontSize: 11, fill: C.muted }}
            />
          </YAxis>
          <Tooltip
            formatter={(v, name) => [v != null ? v.toFixed(4) : '—', name]}
            contentStyle={{
              fontFamily: 'DM Mono', fontSize: 12,
              border: '1px solid #E2DDD8', background: '#F4F1EC',
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{
              fontFamily: 'DM Mono', fontSize: 12,
              paddingBottom: 8,
              lineHeight: '20px',
            }}
          />
          {cohorts.map(({ label }, i) => (
            <Line
              key={label}
              type="stepAfter"
              dataKey={label}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
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
