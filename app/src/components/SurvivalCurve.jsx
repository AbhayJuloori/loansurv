import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Label,
} from 'recharts'

const C = {
  curve:  '#1C1917',
  band:   'rgba(28,25,23,0.07)',
  accent: '#C2692A',
  border: '#E2DDD8',
  muted:  '#78716C',
}

const X_TICKS = [0, 12, 24, 36, 48, 60]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const prob = payload.find(p => p.name === 'probability')?.value
  const defaultProb = prob != null ? (1 - prob) : null
  return (
    <div className="bg-surface border border-border px-3 py-2.5" style={{ minWidth: 150 }}>
      <p className="font-mono text-text-muted mb-1" style={{ fontSize: 11 }}>Month {label}</p>
      {prob != null && (
        <>
          <p className="font-mono text-text-primary font-500" style={{ fontSize: 13 }}>
            S(t) = {prob.toFixed(4)}
          </p>
          <p className="font-mono mt-0.5" style={{ fontSize: 11, color: defaultProb > 0.15 ? '#DC2626' : C.muted }}>
            Default prob: {(defaultProb * 100).toFixed(1)}%
          </p>
        </>
      )}
    </div>
  )
}

export default function SurvivalCurve({ curve, median }) {
  if (!curve?.length) {
    return (
      <div className="flex flex-col items-center justify-center text-text-muted font-mono gap-2"
           style={{ height: 340, fontSize: 13 }}>
        <span>Enter borrower details to generate survival curve</span>
        <span style={{ fontSize: 11, opacity: 0.6 }}>or select a profile below</span>
      </div>
    )
  }

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
    <div style={{ height: 340, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 24, bottom: 40, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
          <XAxis
            dataKey="month"
            type="number"
            domain={[0, 60]}
            ticks={X_TICKS}
            tickFormatter={v => v === 0 ? '0' : `${v}mo`}
            tick={{ fontFamily: 'DM Mono', fontSize: 12, fill: C.muted }}
            stroke={C.border}
          >
            <Label
              value="Months since origination"
              position="insideBottom"
              offset={-22}
              style={{ fontFamily: 'DM Mono', fontSize: 11, fill: C.muted }}
            />
          </XAxis>
          <YAxis
            domain={[0, 1]}
            tickCount={6}
            tick={{ fontFamily: 'DM Mono', fontSize: 12, fill: C.muted }}
            tickFormatter={v => v.toFixed(1)}
            stroke={C.border}
            width={52}
          >
            <Label
              value="P(no default)"
              angle={-90}
              position="insideLeft"
              offset={16}
              style={{ fontFamily: 'DM Mono', fontSize: 11, fill: C.muted }}
            />
          </YAxis>
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
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: `median: ${clampedMedian}mo`,
                position: 'insideTopRight',
                fontFamily: 'DM Mono',
                fontSize: 11,
                fill: C.accent,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
