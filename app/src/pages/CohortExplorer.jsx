import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import axios from 'axios'
import CohortComparison from '../components/CohortComparison'

const SEG_TYPES = {
  grade:          { label: 'Grade',        values: ['A','B','C','D','E','F','G'] },
  term:           { label: 'Term',         values: ['36','60'] },
  purpose:        { label: 'Purpose',      values: ['debt_consolidation','credit_card',
                                                     'home_improvement','major_purchase',
                                                     'small_business'] },
  home_ownership: { label: 'Ownership',    values: ['RENT','OWN','MORTGAGE'] },
}

export default function CohortExplorer() {
  const [segType, setSegType] = useState('grade')
  const { values } = SEG_TYPES[segType]

  const queries = useQueries({
    queries: values.map(val => ({
      queryKey: ['cohort', segType, val],
      queryFn: () =>
        axios.get(`/api/cohort/${segType}_${val}`).then(r => r.data),
      staleTime: Infinity,
    })),
  })

  const isLoading = queries.some(q => q.isLoading)
  const pvalue    = queries[0]?.data?.logrank_pvalue

  const cohorts = values.map((val, i) => ({
    label: val,
    curve: queries[i]?.data?.curve || [],
  }))

  return (
    <div className="px-6 py-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="font-sans font-500 text-xl text-text-primary">
          Cohort Explorer
        </h1>
        {pvalue != null && (
          <span className="font-mono text-xs px-2 py-1 border border-border text-text-muted">
            log-rank p = {pvalue < 0.0001 ? '<0.0001' : pvalue.toFixed(4)}
          </span>
        )}
        {isLoading && (
          <span className="font-mono text-xs text-text-muted animate-pulse">
            loading…
          </span>
        )}
      </div>

      {/* Segment type tabs */}
      <div className="flex gap-1.5 mb-6">
        {Object.entries(SEG_TYPES).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setSegType(key)}
            className={`font-mono text-xs px-3 py-1.5 border transition-all duration-150 ${
              segType === key
                ? 'border-accent text-accent bg-surface'
                : 'border-border text-text-muted hover:text-text-primary hover:border-text-muted'
            }`}
            style={{ borderRadius: 4 }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <p className="font-mono text-2xs uppercase tracking-widest text-text-muted mb-3">
        Survival Function — stratified by {segType.replace('_', ' ')}
      </p>
      <CohortComparison cohorts={cohorts} />

      {/* Interpretation hint */}
      <p className="font-mono text-2xs text-text-muted mt-4">
        Curves show P(no default by month t) for each cohort. Lower curves = higher default risk.
      </p>
    </div>
  )
}
