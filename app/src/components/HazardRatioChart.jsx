const MAX_W = 110
const RED   = 'rgba(220,38,38,0.65)'
const GREEN = 'rgba(22,163,74,0.65)'

function shortLabel(feat) {
  const map = {
    credit_line_age: 'cr_line_age',
    log_annual_inc:  'log_income',
    income_to_loan:  'inc/loan',
  }
  return map[feat] || feat
}

export default function HazardRatioChart({ hazardRatios }) {
  if (!hazardRatios || !Object.keys(hazardRatios).length) return null

  const entries = Object.entries(hazardRatios)
    .map(([feat, v]) => ({
      feat,
      hr:  v.hr,
      pct: Math.round((v.hr - 1) * 100),
    }))
    .filter(e => Math.abs(e.pct) >= 1)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 10)

  if (!entries.length) return null

  const maxAbs = Math.max(...entries.map(e => Math.abs(e.pct)), 1)

  return (
    <div className="mt-5">
      {/* Section title in accent */}
      <p className="font-mono uppercase text-accent mb-4"
         style={{ fontSize: 11, letterSpacing: '0.1em' }}>
        Hazard Ratio Impact
      </p>

      <div className="flex flex-col" style={{ gap: 10 }}>
        {entries.map(({ feat, pct }) => {
          const isRisk = pct > 0
          const barW   = Math.max(3, Math.round((Math.abs(pct) / maxAbs) * MAX_W))
          const color  = isRisk ? RED : GREEN

          return (
            <div key={feat} className="flex items-center" style={{ gap: 8, height: 32 }}>
              {/* Feature label */}
              <span
                className="font-mono text-text-muted flex-shrink-0 text-right"
                style={{ width: 100, fontSize: 13 }}
              >
                {shortLabel(feat)}
              </span>

              {/* Bar chart area */}
              <div
                className="relative flex items-center flex-shrink-0"
                style={{ width: MAX_W * 2 + 1, height: 32 }}
              >
                {/* Centre pivot */}
                <div
                  className="absolute inset-y-0 bg-border"
                  style={{ left: MAX_W, width: 1 }}
                />
                {/* Bar */}
                <div
                  className="absolute"
                  style={{
                    height: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width:  barW,
                    background: color,
                    borderRadius: 2,
                    ...(isRisk
                      ? { left: MAX_W + 1 }
                      : { right: MAX_W + 1 }),
                  }}
                />
              </div>

              {/* Value */}
              <span
                className="font-mono flex-shrink-0"
                style={{
                  fontSize: 13,
                  color: isRisk ? '#DC2626' : '#16A34A',
                  minWidth: 44,
                }}
              >
                {isRisk ? '+' : ''}{pct}%
              </span>
            </div>
          )
        })}
      </div>

      {/* Footnote in accent at 60% opacity, italic */}
      <p
        className="font-mono mt-4"
        style={{ fontSize: 11, color: 'rgba(194,105,42,0.6)', fontStyle: 'italic' }}
      >
        Relative change in default hazard vs. population mean. From Cox PH model.
      </p>
    </div>
  )
}
