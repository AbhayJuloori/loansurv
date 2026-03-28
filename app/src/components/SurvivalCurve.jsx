import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

const C = {
  curve:  '#1C1917',
  band:   'rgba(28,25,23,0.06)',
  accent: '#C2692A',
  border: '#E2DDD8',
  muted:  '#78716C',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const prob = payload.find(p => p.name === 'probability')?.value
  return (
    <div className="bg-surface border border-border px-3 py-2">
      <p className="font-mono text-2xs text-text-muted mb-0.5">Month {label}</p>
      {prob != null && (
        <p className="font-mono text-sm text-text-primary">
          S(t) = {prob.toFixed(4)}
        </p>
      )}
    </div>
  )
}

export default function SurvivalCurve({ curve, median }) {
  if (!curve?.length) {
    return (
      <div className="flex items-center justify-center text-text-muted font-mono text-sm"
           style={{ height: 220 }}>
        Enter borrower details to generate survival curve
      </div>
    )
  }

  const data = curve.map(p => ({
    month:       p.month,
    probability: p.probability,
    band:        [
      p.lower ?? Math.max(0, p.probability - 0.04),
      p.upper ?? Math.min(1, p.probability + 0.04),
    ],
  }))

  return (
    <div style={{ height: 220, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 20, bottom: 24, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: C.muted }}
            stroke={C.border}
            label={{
              value: 'Month',
              position: 'insideBottom',
              offset: -10,
              fontFamily: 'DM Mono',
              fontSize: 10,
              fill: C.muted,
            }}
          />
          <YAxis
            domain={[0, 1]}
            tickCount={6}
            tick={{ fontFamily: 'DM Mono', fontSize: 10, fill: C.muted }}
            tickFormatter={v => v.toFixed(1)}
            stroke={C.border}
            width={34}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            dataKey="band"
            fill={C.band}
            stroke="none"
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            type="stepAfter"
            dataKey="probability"
            stroke={C.curve}
            strokeWidth={2}
            dot={false}
            animationDuration={500}
            animationEasing="ease-out"
          />
          {median != null && (
            <ReferenceLine
              x={median}
              stroke={C.accent}
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{
                value: `${median} mo`,
                position: 'insideTopRight',
                fontFamily: 'DM Mono',
                fontSize: 10,
                fill: C.accent,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
