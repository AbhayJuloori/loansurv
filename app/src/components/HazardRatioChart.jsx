const MAX_W = 100 // max bar half-width in px
const RED   = 'rgba(220,38,38,0.65)'
const GREEN = 'rgba(22,163,74,0.65)'

export default function HazardRatioChart({ hazardRatios }) {
  if (!hazardRatios || !Object.keys(hazardRatios).length) return null

  const entries = Object.entries(hazardRatios)
    .map(([feat, v]) => ({
      feat,
      hr:  v.hr,
      pct: Math.round((v.hr - 1) * 100),
    }))
    .filter(e => Math.abs(e.pct) >= 2)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 10)

  if (!entries.length) return null

  const maxAbs = Math.max(...entries.map(e => Math.abs(e.pct)), 1)

  return (
    <div className="mt-5">
      <p className="font-mono text-2xs uppercase tracking-widest text-text-muted mb-3">
        Hazard Ratio Impact
      </p>
      <div className="flex flex-col gap-2.5">
        {entries.map(({ feat, pct }) => {
          const isRisk = pct > 0
          const barW   = Math.round((Math.abs(pct) / maxAbs) * MAX_W)
          const color  = isRisk ? RED : GREEN
          const label  = isRisk ? `+${pct}%` : `${pct}%`

          return (
            <div key={feat} className="flex items-center gap-2">
              {/* feature label */}
              <span className="font-mono text-xs text-text-muted w-28 flex-shrink-0 text-right truncate">
                {feat}
              </span>

              {/* chart area */}
              <div
                className="relative flex items-center flex-shrink-0"
                style={{ width: MAX_W * 2 + 1 }}
              >
                {/* centre pivot */}
                <div
                  className="absolute inset-y-0 bg-border"
                  style={{ left: MAX_W, width: 1 }}
                />
                {/* bar */}
                <div
                  className="absolute"
                  style={{
                    height: 10,
                    width:  barW,
                    background: color,
                    borderRadius: 2,
                    ...(isRisk
                      ? { left: MAX_W + 1 }
                      : { right: MAX_W + 1 }),
                  }}
                />
              </div>

              {/* value */}
              <span
                className="font-mono text-xs flex-shrink-0"
                style={{ color: isRisk ? '#DC2626' : '#16A34A' }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
      <p className="font-mono text-2xs text-text-muted mt-3">
        Relative change in default hazard vs. population mean. From Cox PH model.
      </p>
    </div>
  )
}
