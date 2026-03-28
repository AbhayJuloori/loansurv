import { useState, useEffect, useRef, useCallback } from 'react'
import { useExample, usePrediction } from '../hooks/usePrediction'
import BorrowerForm   from '../components/BorrowerForm'
import MetricStrip    from '../components/MetricStrip'
import SurvivalCurve  from '../components/SurvivalCurve'
import HazardRatioChart from '../components/HazardRatioChart'

export default function BorrowerAnalysis() {
  const { data: example, isLoading: exampleLoading } = useExample()
  const { mutate: predict, data: result, isPending } = usePrediction()
  const [features, setFeatures] = useState(null)
  const timerRef = useRef(null)

  // Seed form with example once loaded
  useEffect(() => {
    if (example && !features) {
      setFeatures(example)
      predict(example)
    }
  }, [example])

  const handleChange = useCallback((f) => {
    setFeatures(f)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => predict(f), 350)
  }, [predict])

  return (
    <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── Left: form panel ─────────────────────────────── */}
      <div
        className="flex-shrink-0 border-r border-border bg-surface overflow-hidden flex flex-col"
        style={{ width: 280 }}
      >
        {exampleLoading ? (
          <div className="flex items-center justify-center h-full font-mono text-xs text-text-muted">
            Loading…
          </div>
        ) : (
          <BorrowerForm defaults={features} onChange={handleChange} />
        )}
      </div>

      {/* ── Right: output panel ───────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
        <MetricStrip data={result} />

        <div className="flex-1 px-6 py-5">
          {/* Chart header */}
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono uppercase text-accent"
               style={{ fontSize: 11, letterSpacing: '0.1em' }}>
              Survival Function — P(no default by month t)
            </p>
            {isPending && (
              <span className="font-mono text-2xs text-text-muted animate-pulse">
                updating…
              </span>
            )}
          </div>

          <SurvivalCurve
            curve={result?.survival_curve}
            median={result?.median_survival_months}
          />

          <div className="mt-1 border-t border-border" />

          <HazardRatioChart hazardRatios={result?.hazard_ratios} />
        </div>
      </div>

    </div>
  )
}
