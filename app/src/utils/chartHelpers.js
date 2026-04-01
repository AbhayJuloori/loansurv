export function probAt(curve, month) {
  if (!curve?.length) return null
  const entry = curve.find(p => p.month >= month)
  return entry ? entry.probability : curve[curve.length - 1].probability
}

export function defaultProbAt(curve, month) {
  const s = probAt(curve, month)
  return s != null ? 1 - s : null
}

export function medianSurvival(curve) {
  if (!curve?.length) return null
  const entry = curve.find(p => p.probability <= 0.5)
  return entry ? entry.month : null
}

// Merge multi-cohort curves into a single recharts dataset keyed by month
// Capped at 60 months to match stated observation window
export function mergeCohortCurves(cohorts, maxMonth = 60) {
  const monthSet = new Set()
  cohorts.forEach(({ curve }) =>
    curve?.filter(p => p.month <= maxMonth).forEach(p => monthSet.add(p.month))
  )
  const months = [...monthSet].sort((a, b) => a - b)
  return months.map(month => {
    const row = { month }
    cohorts.forEach(({ label, curve }) => {
      const p = curve?.find(c => c.month >= month)
      row[label] = p != null ? p.probability : null
    })
    return row
  })
}
