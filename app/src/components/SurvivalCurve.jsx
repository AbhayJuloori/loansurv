import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

const C = {
  curve:  '#1C1917',
  band:   'rgba(28,25,23,0.09)',
  accent: '#C2692A',
  border: '#E2DDD8',
  muted:  '#78716C',
}

const X_TICKS = [0, 12, 24, 36, 48, 60]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const prob = payload.find(p => p.name === 'probability')?.value
  return (
    <div className="bg-surface border border-border px-3 py-2">
      <p className="font-mono text-text-muted mb-0.5" style={{ fontSize: 10 }}>Month {label}</p>
      {prob != null && (
        <p className="font-mono text-text-primary" style={{ fontSize: 12 }}>
          S(t) = {prob.toFixed(4)}
        </p>
      )}
    </div>
  )
}

export default function SurvivalCurve({ curve, median }) {
  if (!curve?.length) {
    return (
      <div className="flex items-center justify-center text-text-muted font-mono"
           style={{ height: 290, fontSize: 12 }}>
        Enter borrower details to generate survival curve
      </div>
    )
  }

  // Cap at 60 months
  const data = curve
    .filter(p => p.month <= 60)
    .map(p => ({
      month:       p.month,
      probability: p.probability,
      band:        [
        p.lower ?? Math.max(0, p.probability - 0.05),
        p.upper ?? Math.min(1, p.probability + 0.05),
      ],
    }))

  const clampedMedian = median != null && median <= 60 ? median : null

  return (
    <div style={{ height: 290, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 20, bottom: 28, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
          <XAxis
            dataKey="month"
            type="number"
            domain={[0, 60]}
            ticks={X_TICKS}
            tickFormatter={v => v === 0 ? '0' : `${v} mo`}
            tick={{ fontFamily: 'DM Mono', fontSize: 12, fill: C.muted }}
            stroke={C.border}
          />
          <YAxis
            domain={[0, 1]}
            tickCount={6}
            tick={{ fontFamily: 'DM Mono', fontSize: 12, fill: C.muted }}
            tickFormatter={v => v.toFixed(1)}
            stroke={C.border}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            dataKey="band"
            fill={C.band}
            stroke="none"
            isAnimationActive={false}
            legendType="none"
            activeDot={false}
          />
          <Line
            type="stepAfter"
            dataKey="probability"
            stroke={C.curve}
            strokeWidth={2.5}
            dot={false}
            animationDuration={500}
            animationEasing="ease-out"
          />
          {clampedMedian != null && (
            <ReferenceLine
              x={clampedMedian}
              stroke={C.accent}
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{
                value: `${clampedMedian} mo`,
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
