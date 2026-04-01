const MAX_W = 120
const RED   = 'rgba(220,38,38,0.7)'
const GREEN = 'rgba(22,163,74,0.7)'

function shortLabel(feat) {
  const map = {
    credit_line_age: 'credit age',
    log_annual_inc:  'log income',
    income_to_loan:  'income/loan',
    fico_range_low:  'FICO score',
    revol_util:      'revol util',
    revol_bal:       'revol bal',
    loan_amnt:       'loan amt',
    int_rate:        'int rate',
    annual_inc:      'annual inc',
    open_acc:        'open accts',
    pub_rec:         'pub records',
    delinq_2yrs:     'delinquencies',
  }
  return map[feat] || feat.replace(/_/g, ' ')
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
    <div className="mt-6">
      {/* Section title */}
      <div className="flex items-baseline justify-between mb-1">
        <p className="font-mono uppercase text-accent" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
          Top Risk Factors
        </p>
        <p className="font-sans text-text-muted" style={{ fontSize: 12 }}>
          top 10 · Cox PH model
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-1.5">
          <div style={{ width: 12, height: 12, borderRadius: 2, background: RED }} />
          <span className="font-sans text-text-muted" style={{ fontSize: 12 }}>
            Increases default risk
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 12, height: 12, borderRadius: 2, background: GREEN }} />
          <span className="font-sans text-text-muted" style={{ fontSize: 12 }}>
            Reduces default risk
          </span>
        </div>
        <span className="font-sans text-text-muted ml-auto" style={{ fontSize: 11, fontStyle: 'italic' }}>
          % change in hazard vs. avg borrower
        </span>
      </div>

      <div className="flex flex-col" style={{ gap: 9 }}>
        {entries.map(({ feat, pct }) => {
          const isRisk = pct > 0
          const barW   = Math.max(4, Math.round((Math.abs(pct) / maxAbs) * MAX_W))
          const color  = isRisk ? RED : GREEN

          return (
            <div key={feat} className="flex items-center" style={{ gap: 10, height: 28 }}>
              {/* Feature label */}
              <span
                className="font-mono text-text-muted flex-shrink-0 text-right"
                style={{ width: 108, fontSize: 12 }}
              >
                {shortLabel(feat)}
              </span>

              {/* Bar chart area */}
              <div
                className="relative flex items-center flex-shrink-0"
                style={{ width: MAX_W * 2 + 1, height: 28 }}
              >
                {/* Centre pivot line */}
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
                className="font-mono font-500 flex-shrink-0"
                style={{
                  fontSize: 13,
                  color: isRisk ? '#DC2626' : '#16A34A',
                  minWidth: 50,
                }}
              >
                {isRisk ? '+' : ''}{pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
