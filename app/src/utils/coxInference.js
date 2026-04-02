/**
 * In-browser Cox PH inference.
 * Replicates the Python preprocessing pipeline (preprocessor.py) and
 * the Cox PH survival formula:  S(t|x) = exp( -H0(t) * exp(β·x) )
 */

const GRADE_MAP = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 }
const EMP_MAP = {
  '< 1 year': 0, '1 year': 1, '2 years': 2, '3 years': 3,
  '4 years': 4, '5 years': 5, '6 years': 6, '7 years': 7,
  '8 years': 8, '9 years': 9, '10+ years': 10,
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Features that go through StandardScaler (must match preprocessor._scale_cols)
const SCALED_FEATS = new Set([
  'fico_mid', 'log_annual_inc', 'income_to_loan', 'credit_line_age',
  'dti', 'int_rate', 'revol_util', 'revol_bal', 'loan_amnt', 'open_acc', 'emp_length',
])

/**
 * Replicate Python's preprocessor._engineer() + _impute() + StandardScaler.transform()
 * for a single raw borrower dict (matching BorrowerFeatures schema).
 */
function preprocess(raw, scaler) {
  const fico_mid = (Number(raw.fico_range_low) + Number(raw.fico_range_high)) / 2
  const log_annual_inc = Math.log1p(Math.max(0, Number(raw.annual_inc)))
  const income_to_loan = Number(raw.annual_inc) / (Number(raw.loan_amnt) || 1)
  const revol_bal = Math.log1p(Math.max(0, Number(raw.revol_bal)))
  const grade = GRADE_MAP[raw.grade] ?? 3
  const term = Number(raw.term)
  const emp_length = EMP_MAP[raw.emp_length] ?? 5
  const pub_rec = Math.min(Number(raw.pub_rec), 5)
  const delinq_2yrs = Math.min(Number(raw.delinq_2yrs), 5)
  const open_acc = Number(raw.open_acc)
  const dti = Number(raw.dti)
  const revol_util = Number(raw.revol_util)
  const loan_amnt = Number(raw.loan_amnt)
  const int_rate = Number(raw.int_rate)

  // credit_line_age: months from earliest_cr_line to Dec 2018
  let credit_line_age = 0
  if (raw.earliest_cr_line) {
    const parts = raw.earliest_cr_line.split('-')
    if (parts.length === 2) {
      const mo = MONTHS.indexOf(parts[0]) + 1
      const yr = parseInt(parts[1], 10)
      credit_line_age = Math.max(0, (2018 - yr) * 12 + (12 - mo))
    }
  }

  const raw_feats = {
    fico_mid, log_annual_inc, income_to_loan, credit_line_age,
    grade, term, dti, int_rate, revol_util, revol_bal,
    loan_amnt, pub_rec, delinq_2yrs, emp_length, open_acc,
  }

  // Apply z-score only to SCALED_FEATS
  const processed = {}
  for (const [k, v] of Object.entries(raw_feats)) {
    if (SCALED_FEATS.has(k) && scaler[k]) {
      processed[k] = (v - scaler[k].mean) / scaler[k].std
    } else {
      processed[k] = v
    }
  }
  return processed
}

/**
 * Returns a survival curve array: [{month, probability}, ...]
 */
export function predictCox(raw, modelData) {
  const { features, coefs, times, baseline_cumhazard, scaler } = modelData.cox
  const processed = preprocess(raw, scaler)

  // Linear predictor η = β · x
  const eta = features.reduce((sum, f) => sum + (processed[f] ?? 0) * (coefs[f] ?? 0), 0)
  const expEta = Math.exp(eta)

  // S(t|x) = exp(-H0(t) * exp(η))
  return times.map((t, i) => ({
    month: t,
    probability: Math.round(Math.exp(-baseline_cumhazard[i] * expEta) * 10000) / 10000,
  }))
}

/**
 * Interpolate survival probability at a specific month from a curve array.
 */
export function probAtMonth(curve, month) {
  const p = curve.find(pt => pt.month >= month)
  return p ? p.probability : (curve.at(-1)?.probability ?? 0.5)
}

/**
 * Risk percentile: fraction of reference borrowers with lower 36m default risk than this borrower.
 * Higher percentile = riskier.
 */
export function riskPercentile(defaultProb36m, riskSample) {
  if (!riskSample?.length) return null
  const lower = riskSample.filter(p => p < defaultProb36m).length
  return Math.round((lower / riskSample.length) * 100)
}

/**
 * Median survival time (month where S(t) first drops below 0.5), or null if > 60mo.
 */
export function medianSurvival(curve) {
  const pt = curve.find(p => p.probability <= 0.5)
  return pt ? pt.month : null
}
