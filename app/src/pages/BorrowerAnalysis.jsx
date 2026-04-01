import { useState, useEffect, useRef, useCallback } from 'react'
import { useExample, usePrediction } from '../hooks/usePrediction'
import BorrowerForm    from '../components/BorrowerForm'
import MetricStrip     from '../components/MetricStrip'
import SurvivalCurve   from '../components/SurvivalCurve'
import HazardRatioChart from '../components/HazardRatioChart'

const PRESETS = [
  {
    id: 'prime',
    label: 'Prime',
    tagline: 'Portfolio anchor',
    insight: 'Flat survival curve — this borrower\'s default risk is front-loaded near origination and quickly stabilizes. Grade A borrowers account for the bulk of Lending Club\'s fully-paid population. Low DTI and high FICO combine to suppress the hazard rate throughout the loan term.',
    features: {
      grade: 'A', term: 36, loan_amnt: 15000, int_rate: 6.5,
      annual_inc: 120000, dti: 6.0, emp_length: '10+ years',
      home_ownership: 'MORTGAGE', purpose: 'debt_consolidation',
      fico_range_low: 775, fico_range_high: 779,
      revol_util: 12, revol_bal: 4500, open_acc: 12,
      pub_rec: 0, delinq_2yrs: 0, earliest_cr_line: 'Jan-2000',
    },
  },
  {
    id: 'established',
    label: 'Established',
    tagline: 'Homeowner, long history',
    insight: 'Grade B homeowner refinancing for home improvement. Long credit history suppresses the credit_line_age hazard component. The MORTGAGE flag correlates with lower revolving utilization and more stable income. Curve declines gradually — no sharp early-default inflection.',
    features: {
      grade: 'B', term: 36, loan_amnt: 20000, int_rate: 9.5,
      annual_inc: 95000, dti: 12.0, emp_length: '7 years',
      home_ownership: 'MORTGAGE', purpose: 'home_improvement',
      fico_range_low: 735, fico_range_high: 739,
      revol_util: 28, revol_bal: 12000, open_acc: 14,
      pub_rec: 0, delinq_2yrs: 0, earliest_cr_line: 'Jan-2003',
    },
  },
  {
    id: 'midmarket',
    label: 'Mid-Market',
    tagline: 'Typical LC borrower',
    insight: 'The modal Lending Club profile — Grade C renter consolidating credit card debt. Survival curve shows a moderate, steady decline. This segment drives the bulk of origination volume and sits near the portfolio\'s average default rate. A useful benchmark for comparing individual borrowers.',
    features: {
      grade: 'C', term: 36, loan_amnt: 12000, int_rate: 13.5,
      annual_inc: 65000, dti: 18.0, emp_length: '5 years',
      home_ownership: 'RENT', purpose: 'debt_consolidation',
      fico_range_low: 685, fico_range_high: 689,
      revol_util: 55, revol_bal: 8000, open_acc: 9,
      pub_rec: 0, delinq_2yrs: 0, earliest_cr_line: 'Jan-2010',
    },
  },
  {
    id: 'stretched',
    label: 'Stretched',
    tagline: 'Extended term, high util',
    insight: 'Grade D borrower on a 60-month term with high revolving utilization — a classic stress pattern. The curve steepens noticeably after month 18. Extended term means the borrower is exposed to income shocks for longer, and high revolving debt signals limited financial slack. Watch the 24-month default probability closely.',
    features: {
      grade: 'D', term: 60, loan_amnt: 18000, int_rate: 20.0,
      annual_inc: 48000, dti: 29.0, emp_length: '2 years',
      home_ownership: 'RENT', purpose: 'credit_card',
      fico_range_low: 645, fico_range_high: 649,
      revol_util: 78, revol_bal: 22000, open_acc: 7,
      pub_rec: 0, delinq_2yrs: 1, earliest_cr_line: 'Jan-2013',
    },
  },
  {
    id: 'highrisk',
    label: 'High Risk',
    tagline: 'Subprime, deep util',
    insight: 'Grade F borrower with near-maxed revolving utilization and a delinquency record. The survival curve drops sharply in the first 12–18 months — early default dominates this profile. The hazard rate is highest at origination and partially reflects adverse selection: borrowers in this grade who accepted Lending Club\'s rates were often shut out of other credit channels.',
    features: {
      grade: 'F', term: 60, loan_amnt: 25000, int_rate: 27.0,
      annual_inc: 35000, dti: 38.0, emp_length: '1 year',
      home_ownership: 'RENT', purpose: 'credit_card',
      fico_range_low: 615, fico_range_high: 619,
      revol_util: 92, revol_bal: 31000, open_acc: 5,
      pub_rec: 1, delinq_2yrs: 2, earliest_cr_line: 'Jan-2015',
    },
  },
]

export default function BorrowerAnalysis() {
  const { data: example, isLoading: exampleLoading } = useExample()
  const { mutate: predict, data: result, isPending } = usePrediction()
  const [features, setFeatures] = useState(null)
  const [activePreset, setActivePreset] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (example && !features) {
      setFeatures(example)
      predict(example)
    }
  }, [example])

  const handleChange = useCallback((f) => {
    setFeatures(f)
    setActivePreset(null)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => predict(f), 350)
  }, [predict])

  function applyPreset(preset) {
    setActivePreset(preset.id)
    setFeatures(preset.features)
    predict(preset.features)
  }

  const currentPreset = PRESETS.find(p => p.id === activePreset)

  return (
    <div className="flex" style={{ height: 'calc(100vh - 60px)' }}>

      {/* ── Left: form panel ─────────────────────────────── */}
      <div
        className="flex-shrink-0 border-r border-border bg-surface overflow-hidden flex flex-col"
        style={{ width: 300 }}
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

        {/* Page intro banner */}
        <div className="px-6 py-4 border-b border-border bg-surface flex items-start justify-between gap-6 flex-shrink-0">
          <div>
            <h1 className="font-mono font-600 text-text-primary" style={{ fontSize: 15, letterSpacing: '0.02em' }}>
              Borrower Risk Assessment
            </h1>
            <p className="font-sans text-text-muted mt-1" style={{ fontSize: 13, lineHeight: 1.5 }}>
              Adjust borrower characteristics on the left to model how default risk evolves over time.
              The curve shows P(no default) at each month — a lower curve means higher default risk.
            </p>
          </div>
          {isPending && (
            <span className="font-mono text-text-muted animate-pulse flex-shrink-0" style={{ fontSize: 12 }}>
              updating…
            </span>
          )}
        </div>

        <MetricStrip data={result} />

        {/* ── Main two-column content area ─────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* Left column: charts */}
          <div className="flex-1 px-6 py-5 overflow-y-auto min-w-0">

            {/* Survival curve */}
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono uppercase text-accent"
                 style={{ fontSize: 11, letterSpacing: '0.1em' }}>
                Survival Function — P(no default by month t)
              </p>
              <p className="font-sans text-text-muted" style={{ fontSize: 12 }}>
                Shaded band = 95% CI
              </p>
            </div>
            <SurvivalCurve
              curve={result?.survival_curve}
              median={result?.median_survival_months}
            />

            <div className="mt-2 border-t border-border" />

            {/* Hazard ratio chart */}
            <HazardRatioChart hazardRatios={result?.hazard_ratios} />
          </div>

          {/* Right column: preset profiles */}
          <div
            className="flex-shrink-0 border-l border-border px-5 py-5 overflow-y-auto"
            style={{ width: 300 }}
          >
            <div className="mb-4">
              <p className="font-mono uppercase text-accent"
                 style={{ fontSize: 11, letterSpacing: '0.1em' }}>
                Borrower Profiles
              </p>
              <p className="font-sans text-text-muted mt-1" style={{ fontSize: 12, lineHeight: 1.5 }}>
                Load a preset to explore how different credit profiles shape the survival curve.
              </p>
            </div>

            {/* Preset buttons */}
            <div className="flex flex-col gap-2 mb-4">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className="flex flex-col items-start border transition-all duration-150 px-3 py-2 w-full text-left cursor-pointer"
                  style={{
                    borderRadius: 4,
                    borderColor: activePreset === p.id ? '#C2692A' : '#E2DDD8',
                    background: activePreset === p.id ? 'rgba(194,105,42,0.06)' : 'transparent',
                  }}
                >
                  <span
                    className="font-mono font-500"
                    style={{
                      fontSize: 13,
                      color: activePreset === p.id ? '#C2692A' : '#1C1917',
                    }}
                  >
                    {p.label}
                  </span>
                  <span className="font-sans text-text-muted" style={{ fontSize: 11 }}>
                    {p.tagline}
                  </span>
                </button>
              ))}
            </div>

            {/* Interpretation text */}
            {currentPreset ? (
              <div
                className="border-l-2 pl-3 py-1"
                style={{ borderColor: '#C2692A' }}
              >
                <p className="font-sans font-400 text-text-muted leading-relaxed"
                   style={{ fontSize: 12 }}>
                  {currentPreset.insight}
                </p>
              </div>
            ) : (
              <div
                className="border-l-2 pl-3 py-1"
                style={{ borderColor: '#E2DDD8' }}
              >
                <p className="font-sans text-text-muted" style={{ fontSize: 12 }}>
                  Select a profile above to load a representative borrower and see a plain-English
                  interpretation of the survival curve.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}
