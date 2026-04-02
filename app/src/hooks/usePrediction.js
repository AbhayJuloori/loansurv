import { useMutation, useQuery } from '@tanstack/react-query'
import { predictCox, probAtMonth, riskPercentile, medianSurvival } from '../utils/coxInference'

const MODEL_DATA_URL = import.meta.env.BASE_URL + 'model_data.json'

// Singleton fetch — load once, reuse everywhere
let _modelDataPromise = null
function loadModelData() {
  if (!_modelDataPromise) {
    _modelDataPromise = fetch(MODEL_DATA_URL).then(r => {
      if (!r.ok) throw new Error(`Failed to load model_data.json: ${r.status}`)
      return r.json()
    })
  }
  return _modelDataPromise
}

const EXAMPLE_BORROWER = {
  grade: 'C', term: 36, annual_inc: 65000, dti: 18.5,
  emp_length: '5 years', home_ownership: 'RENT',
  purpose: 'debt_consolidation', loan_amnt: 12000, int_rate: 13.5,
  revol_util: 55.0, revol_bal: 8000, fico_range_low: 685.0,
  fico_range_high: 689.0, pub_rec: 0.0, delinq_2yrs: 0.0,
  open_acc: 9.0, earliest_cr_line: 'Jan-2010',
}

export function useExample() {
  return useQuery({
    queryKey: ['example'],
    queryFn: () => Promise.resolve(EXAMPLE_BORROWER),
    staleTime: Infinity,
  })
}

export function usePrediction() {
  return useMutation({
    mutationFn: async (features) => {
      const modelData = await loadModelData()
      const curve = predictCox(features, modelData)
      const defaultProb12m = +(1 - probAtMonth(curve, 12)).toFixed(4)
      const defaultProb24m = +(1 - probAtMonth(curve, 24)).toFixed(4)
      const defaultProb36m = +(1 - probAtMonth(curve, 36)).toFixed(4)
      const median = medianSurvival(curve)
      const percentile = riskPercentile(defaultProb36m, modelData.risk_sample)
      const hazardRatios = modelData.model_info?.hazard_ratios ?? {}
      return {
        survival_curve: curve,
        default_prob_12m: defaultProb12m,
        default_prob_24m: defaultProb24m,
        default_prob_36m: defaultProb36m,
        median_survival_months: median,
        risk_percentile: percentile,
        hazard_ratios: hazardRatios,
      }
    },
  })
}

export function useCohort(segmentKey) {
  return useQuery({
    queryKey: ['cohort', segmentKey],
    queryFn: async () => {
      const modelData = await loadModelData()
      const curve = modelData.km?.[segmentKey] ?? []
      const seg_type = segmentKey?.split('_')[0]
      const pvalue = modelData.pvalues?.[seg_type] ?? null
      return { segment: segmentKey, curve, logrank_pvalue: pvalue }
    },
    enabled: !!segmentKey,
    staleTime: Infinity,
  })
}

export function useModelInfo() {
  return useQuery({
    queryKey: ['modelInfo'],
    queryFn: async () => {
      const modelData = await loadModelData()
      const info = modelData.model_info ?? {}
      return {
        training_date: info.training_date ?? '',
        n_training_rows: info.n_training_rows ?? 0,
        c_index: info.c_index ?? {},
        brier_scores: info.brier_scores ?? {},
        features: info.features ?? [],
        hazard_ratios: info.hazard_ratios ?? {},
      }
    },
    staleTime: Infinity,
  })
}
