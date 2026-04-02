import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import CohortComparison from '../components/CohortComparison'

const MODEL_DATA_URL = import.meta.env.BASE_URL + 'model_data.json'
let _modelDataPromise = null
function loadModelData() {
  if (!_modelDataPromise) {
    _modelDataPromise = fetch(MODEL_DATA_URL).then(r => r.json())
  }
  return _modelDataPromise
}

const SEG_TYPES = {
  grade: {
    label: 'Credit Grade',
    values: ['A','B','C','D','E','F','G'],
    displayLabel: v => `Grade ${v}`,
    description: 'Lending Club\'s internal risk grade — A is lowest risk, G is highest.',
  },
  term: {
    label: 'Loan Term',
    values: ['36','60'],
    displayLabel: v => `${v} months`,
    description: '36-month vs. 60-month loans. Longer terms expose borrowers to more income shocks.',
  },
  purpose: {
    label: 'Loan Purpose',
    values: ['debt_consolidation','credit_card','home_improvement','major_purchase','small_business'],
    displayLabel: v => ({
      debt_consolidation: 'Debt Consolidation',
      credit_card:        'Credit Card',
      home_improvement:   'Home Improvement',
      major_purchase:     'Major Purchase',
      small_business:     'Small Business',
    }[v] || v),
    description: 'The stated reason for borrowing. Small business loans tend to carry higher default rates.',
  },
  home_ownership: {
    label: 'Ownership',
    values: ['RENT','OWN','MORTGAGE'],
    displayLabel: v => ({ RENT: 'Rent', OWN: 'Own', MORTGAGE: 'Mortgage' }[v] || v),
    description: 'Ownership status at origination. Check the log-rank p-value to see whether differences between groups are statistically meaningful.',
  },
}

function PValueBadge({ pvalue }) {
  if (pvalue == null) return null
  const isSignificant = pvalue < 0.05
  const display = pvalue < 0.0001 ? '<0.0001' : pvalue.toFixed(4)
  return (
    <div
      className="border px-3 py-2"
      style={{
        borderRadius: 4,
        borderColor: isSignificant ? 'rgba(194,105,42,0.4)' : '#E2DDD8',
        background: isSignificant ? 'rgba(194,105,42,0.04)' : 'transparent',
      }}
    >
      <p className="font-mono text-text-muted" style={{ fontSize: 11 }}>Log-rank test</p>
      <p className="font-mono font-600" style={{ fontSize: 15, color: isSignificant ? '#C2692A' : '#78716C' }}>
        p = {display}
      </p>
      <p className="font-sans text-text-muted mt-1" style={{ fontSize: 12 }}>
        {isSignificant
          ? 'Groups are statistically different — not due to chance.'
          : 'Difference may be due to chance (p ≥ 0.05).'}
      </p>
    </div>
  )
}

export default function CohortExplorer() {
  const [segType, setSegType] = useState('grade')
  const { values, description, displayLabel } = SEG_TYPES[segType]

  const queries = useQueries({
    queries: values.map(val => ({
      queryKey: ['cohort', segType, val],
      queryFn: async () => {
        const modelData = await loadModelData()
        const key = `${segType}_${val}`
        const curve = modelData.km?.[key] ?? []
        const pvalue = modelData.pvalues?.[segType] ?? null
        return { segment: key, curve, logrank_pvalue: pvalue }
      },
      staleTime: Infinity,
    })),
  })

  const isLoading = queries.some(q => q.isLoading)
  const pvalue    = queries[0]?.data?.logrank_pvalue

  const cohorts = values.map((val, i) => ({
    label: displayLabel ? displayLabel(val) : val,
    curve: queries[i]?.data?.curve || [],
  }))

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 60px)' }}>

      {/* ── Left panel: controls + explanation ────────── */}
      <div
        className="flex-shrink-0 border-r border-border bg-surface flex flex-col px-5 py-6"
        style={{ width: 280 }}
      >
        <h1 className="font-mono font-600 text-text-primary mb-1" style={{ fontSize: 15 }}>
          Cohort Explorer
        </h1>
        <p className="font-sans text-text-muted mb-5" style={{ fontSize: 13, lineHeight: 1.55 }}>
          Compare how default risk evolves differently across borrower groups.
          Each curve shows the probability a cohort <em>survives</em> (doesn't default) over 60 months.
        </p>

        <div className="mb-5 border-t border-border pt-4">
          <p className="font-mono uppercase text-accent mb-2" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
            How to read this
          </p>
          <ul className="flex flex-col gap-2">
            <li className="flex items-start gap-2">
              <span className="font-mono text-accent flex-shrink-0" style={{ fontSize: 13 }}>↓</span>
              <span className="font-sans text-text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                Lower curves = higher default rate for that group
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-accent flex-shrink-0" style={{ fontSize: 13 }}>→</span>
              <span className="font-sans text-text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                Steeper drop early = front-loaded default risk
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-accent flex-shrink-0" style={{ fontSize: 13 }}>≈</span>
              <span className="font-sans text-text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                Curves close together = similar risk levels
              </span>
            </li>
          </ul>
        </div>

        <div className="mb-5">
          <p className="font-mono uppercase text-accent mb-2" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
            Segment by
          </p>
          <div className="flex flex-col gap-1.5">
            {Object.entries(SEG_TYPES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setSegType(key)}
                className={`text-left font-sans px-3 py-2 border transition-all duration-150 cursor-pointer ${
                  segType === key
                    ? 'border-accent text-accent bg-white'
                    : 'border-border text-text-muted hover:text-text-primary hover:border-text-muted bg-transparent'
                }`}
                style={{ borderRadius: 4, fontSize: 13 }}
              >
                {label}
              </button>
            ))}
          </div>
          {description && (
            <p className="font-sans text-text-muted mt-3" style={{ fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' }}>
              {description}
            </p>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <p className="font-mono uppercase text-accent mb-2" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
            Statistical Test
          </p>
          {isLoading ? (
            <p className="font-mono text-text-muted animate-pulse" style={{ fontSize: 12 }}>Loading…</p>
          ) : (
            <PValueBadge pvalue={pvalue} />
          )}
          <p className="font-sans text-text-muted mt-3" style={{ fontSize: 12, lineHeight: 1.5 }}>
            The log-rank test checks whether survival curve differences across groups are
            statistically significant — ruling out randomness as the explanation.
          </p>
        </div>
      </div>

      {/* ── Right panel: chart ────────────────────────── */}
      <div className="flex-1 flex flex-col px-6 py-6 min-w-0">
        <div className="flex items-baseline justify-between mb-4">
          <p className="font-mono uppercase text-accent" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
            Survival Function — stratified by {SEG_TYPES[segType].label}
          </p>
          <p className="font-sans text-text-muted" style={{ fontSize: 12 }}>
            {values.length} cohorts · Kaplan-Meier estimator
          </p>
        </div>

        <CohortComparison cohorts={cohorts} />

        <p className="font-sans text-text-muted mt-4" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Curves estimated using the Kaplan-Meier method on 1.8M Lending Club loans (2007–2018).
          Fully-paid loans before term end are treated as right-censored: they survived at least that long,
          but we don't know what would have happened after.
        </p>
      </div>

    </div>
  )
}
