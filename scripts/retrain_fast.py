"""
Fast retrain using existing processed parquet.
Improves:
  - Cox: removes income_to_loan + int_rate (collinear with grade/log_annual_inc),
         penalizer 0.1 -> 0.01
  - RSF: 200 trees (was 150), 250k subsample (was 200k), min_samples_leaf=10 (was 15)
         Uses batch prediction for fast evaluation.

Usage:
    python scripts/retrain_fast.py
"""
import json
import math
import sys
import numpy as np
import pandas as pd
import joblib
from lifelines.utils import concordance_index

from src.models.cox_ph import CoxModel
from src.models.rsf import RSFModel

MODELS_DIR = "models"
PARQUET     = "data/processed/loans.parquet"

# ------------------------------------------------------------------
# Cox gets 13 features: drop income_to_loan (collinear w/ log_annual_inc)
#   and int_rate (collinear w/ grade)
# ------------------------------------------------------------------
COX_FEATURES = [
    "fico_mid", "log_annual_inc", "credit_line_age",
    "grade", "term", "dti", "revol_util", "revol_bal",
    "loan_amnt", "pub_rec", "delinq_2yrs", "emp_length", "open_acc",
]

# RSF keeps all 15 features (forests handle collinearity via random splits)
RSF_FEATURES = [
    "fico_mid", "log_annual_inc", "income_to_loan", "credit_line_age",
    "grade", "term", "dti", "int_rate", "revol_util", "revol_bal",
    "loan_amnt", "pub_rec", "delinq_2yrs", "emp_length", "open_acc",
]


def _prep_rsf_X(model, df):
    """Apply the same term extraction as RSFModel._prepare_frame."""
    X = df[model._feature_cols].copy()
    if "term" in X.columns:
        X["term"] = X["term"].astype(str).str.extract(r"(\d+)").astype(float)
    return X.fillna(0).values


def c_index_cox_batch(cox_fitter, feature_cols, eval_df, eval_month=36):
    """Batch C-index for Cox: predict_survival_function returns DataFrame (time x samples)."""
    X = eval_df[feature_cols].dropna()
    mask = eval_df.index.isin(X.index)
    T = eval_df.loc[mask, "duration_months"].values
    E = eval_df.loc[mask, "event"].values

    sf = cox_fitter.predict_survival_function(X)  # DataFrame: rows=times, cols=samples
    times = sf.index.values
    # Find closest time to eval_month
    idx36 = np.searchsorted(times, eval_month)
    idx36 = min(idx36, len(times) - 1)
    probs = sf.iloc[idx36].values  # survival prob at eval_month for each sample
    scores = 1 - probs  # higher score = higher risk
    valid = [(t, s, e) for t, s, e in zip(T, scores, E) if math.isfinite(s)]
    T_v, S_v, E_v = zip(*valid)
    return round(float(concordance_index(T_v, [-s for s in S_v], E_v)), 4)


def brier_cox_batch(cox_fitter, feature_cols, eval_df, t):
    """Batch Brier for Cox."""
    X = eval_df[feature_cols].dropna()
    mask = eval_df.index.isin(X.index)
    sub = eval_df.loc[mask]

    # Drop censored-before-t
    keep = ~((sub["duration_months"] < t) & (sub["event"] == 0))
    X = X.loc[keep]
    sub = sub.loc[keep]

    if len(X) == 0:
        return float("nan")

    sf = cox_fitter.predict_survival_function(X)
    times = sf.index.values
    idx = min(np.searchsorted(times, t), len(times) - 1)
    probs = sf.iloc[idx].values

    actuals = np.where(
        (sub["event"].values == 1) & (sub["duration_months"].values <= t), 0.0, 1.0
    )
    return round(float(np.mean((probs - actuals) ** 2)), 6)


def c_index_rsf_batch(rsf_model_obj, feature_cols, eval_df, eval_month=36):
    """Batch C-index for RSF using predict_survival_function on all rows."""
    from src.models.rsf import RSFModel as _RSF
    # Build a temp wrapper to reuse _prepare_frame
    tmp = _RSF()
    tmp._model = rsf_model_obj
    tmp._feature_cols = feature_cols

    X = _prep_rsf_X(tmp, eval_df)
    T = eval_df["duration_months"].values
    E = eval_df["event"].values

    sf = rsf_model_obj.predict_survival_function(X, return_array=True)  # (n, n_times)
    times = rsf_model_obj.unique_times_
    idx36 = min(np.searchsorted(times, eval_month), len(times) - 1)
    probs = sf[:, idx36]
    scores = 1 - probs
    valid = [(t, s, e) for t, s, e in zip(T, scores, E) if math.isfinite(float(s))]
    T_v, S_v, E_v = zip(*valid)
    return round(float(concordance_index(T_v, [-s for s in S_v], E_v)), 4)


def brier_rsf_batch(rsf_model_obj, feature_cols, eval_df, t):
    """Batch Brier for RSF."""
    from src.models.rsf import RSFModel as _RSF
    tmp = _RSF()
    tmp._model = rsf_model_obj
    tmp._feature_cols = feature_cols

    # Drop censored-before-t
    keep = ~((eval_df["duration_months"] < t) & (eval_df["event"] == 0))
    sub = eval_df.loc[keep]
    if len(sub) == 0:
        return float("nan")

    X = _prep_rsf_X(tmp, sub)
    sf = rsf_model_obj.predict_survival_function(X, return_array=True)
    times = rsf_model_obj.unique_times_
    idx = min(np.searchsorted(times, t), len(times) - 1)
    probs = sf[:, idx]

    actuals = np.where(
        (sub["event"].values == 1) & (sub["duration_months"].values <= t), 0.0, 1.0
    )
    return round(float(np.mean((probs - actuals) ** 2)), 6)


def main():
    print("Loading parquet...", flush=True)
    df = pd.read_parquet(PARQUET)
    print(f"  {len(df):,} rows, event rate {df['event'].mean():.3f}", flush=True)

    # Stratified 2k eval set
    rng = np.random.default_rng(99)
    event_idx    = df.index[df["event"] == 1]
    nonevent_idx = df.index[df["event"] == 0]
    n_eval = 2000
    n_e  = min(len(event_idx), int(n_eval * df["event"].mean()))
    n_ne = n_eval - n_e
    eval_idx = np.concatenate([
        rng.choice(event_idx,    n_e,  replace=False),
        rng.choice(nonevent_idx, n_ne, replace=False),
    ])
    eval_df  = df.loc[eval_idx]
    train_df = df.drop(index=eval_idx)
    print(f"  Eval: {len(eval_df)} rows ({eval_df['event'].sum()} events)", flush=True)

    # ── Cox ────────────────────────────────────────────────
    print("\nTraining Cox PH (13 features, penalizer=0.01)...", flush=True)
    cox_cols  = [c for c in COX_FEATURES if c in train_df.columns]
    cox_train = train_df[cox_cols + ["duration_months", "event"]]
    cox = CoxModel(penalizer=0.01)
    cox._fitter.fit(
        cox_train.dropna(),
        duration_col="duration_months",
        event_col="event",
    )
    cox._feature_cols = cox_cols
    cox._fitted = True
    cox_train_c = round(float(cox._fitter.concordance_index_), 4)
    print(f"  Train concordance: {cox_train_c}", flush=True)

    print("  Evaluating Cox (batch)...", flush=True)
    cox_eval = eval_df[cox_cols + ["duration_months", "event"]]
    cox_c = c_index_cox_batch(cox._fitter, cox_cols, cox_eval)
    print(f"  Holdout C-index: {cox_c}", flush=True)
    cox_brier = {str(t): brier_cox_batch(cox._fitter, cox_cols, cox_eval, t)
                 for t in [12, 24, 36]}
    print(f"  Brier@12/24/36: {cox_brier}", flush=True)
    cox.save(f"{MODELS_DIR}/cox_ph.joblib")
    print("  Cox saved.", flush=True)

    # ── RSF ────────────────────────────────────────────────
    print("\nTraining RSF (200 trees, 250k subsample, min_leaf=10)...", flush=True)
    rsf_cols = [c for c in RSF_FEATURES if c in train_df.columns]

    from sksurv.ensemble import RandomSurvivalForest
    from sksurv.util import Surv

    rsf_df = train_df[rsf_cols + ["duration_months", "event"]].dropna()
    n_sub = 250_000
    ev  = rsf_df[rsf_df["event"] == 1]
    ne  = rsf_df[rsf_df["event"] == 0]
    n_ev = min(len(ev), int(n_sub * rsf_df["event"].mean()))
    n_ne = n_sub - n_ev
    sub_df = pd.concat([
        ev.sample(n_ev, random_state=42),
        ne.sample(min(n_ne, len(ne)), random_state=42),
    ]).sample(frac=1, random_state=42)
    print(f"  Subsample: {len(sub_df):,} rows ({sub_df['event'].sum()} events)", flush=True)

    # Apply same term extraction as RSFModel._prepare_frame
    X_rsf = sub_df[rsf_cols].copy()
    if "term" in X_rsf.columns:
        X_rsf["term"] = X_rsf["term"].astype(str).str.extract(r"(\d+)").astype(float)
    X_rsf = X_rsf.fillna(0).values

    y_rsf = Surv.from_arrays(
        event=sub_df["event"].astype(bool).values,
        time=sub_df["duration_months"].astype(float).values,
    )
    rsf_model_obj = RandomSurvivalForest(
        n_estimators=200,
        max_features="sqrt",
        min_samples_leaf=10,
        n_jobs=-1,
        random_state=42,
    )
    print("  Fitting RSF...", flush=True)
    rsf_model_obj.fit(X_rsf, y_rsf)
    print("  RSF fit complete.", flush=True)

    # Wrap in RSFModel
    rsf = RSFModel()
    rsf._model      = rsf_model_obj
    rsf._feature_cols = rsf_cols
    rsf._times      = rsf_model_obj.unique_times_
    rsf._fitted     = True

    print("  Evaluating RSF (batch)...", flush=True)
    rsf_eval = eval_df[rsf_cols + ["duration_months", "event"]]
    rsf_c = c_index_rsf_batch(rsf_model_obj, rsf_cols, rsf_eval)
    print(f"  Holdout C-index: {rsf_c}", flush=True)
    rsf_brier = {str(t): brier_rsf_batch(rsf_model_obj, rsf_cols, rsf_eval, t)
                 for t in [12, 24, 36]}
    print(f"  Brier@12/24/36: {rsf_brier}", flush=True)
    rsf.save(f"{MODELS_DIR}/rsf.joblib")
    print("  RSF saved.", flush=True)

    # ── Update metadata ────────────────────────────────────
    print("\nUpdating model_metadata.json...", flush=True)
    with open(f"{MODELS_DIR}/model_metadata.json") as f:
        meta = json.load(f)

    meta["models"]["cox_ph"]["c_index"]      = cox_c
    meta["models"]["cox_ph"]["brier_scores"] = cox_brier
    meta["models"]["cox_ph"]["hazard_ratios"] = cox.get_hazard_ratios()
    meta["models"]["rsf"]["c_index"]          = rsf_c
    meta["models"]["rsf"]["brier_scores"]     = rsf_brier
    meta["features"] = rsf_cols

    # Rebuild risk percentile sample from new RSF (batch)
    print("  Rebuilding risk percentile sample (batch)...", flush=True)
    sample = eval_df[rsf_cols + ["duration_months", "event"]].sample(500, random_state=1)
    X_samp = sample[rsf_cols].copy()
    if "term" in X_samp.columns:
        X_samp["term"] = X_samp["term"].astype(str).str.extract(r"(\d+)").astype(float)
    X_samp = X_samp.fillna(0).values
    sf_samp = rsf_model_obj.predict_survival_function(X_samp, return_array=True)
    times   = rsf_model_obj.unique_times_
    idx36   = min(np.searchsorted(times, 36), len(times) - 1)
    ref_probs = [round(float(1 - sf_samp[i, idx36]), 4) for i in range(len(sample))]
    meta["risk_percentile_sample"] = ref_probs

    with open(f"{MODELS_DIR}/model_metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n{'='*50}", flush=True)
    print(f"DONE. Cox C-index: {cox_c}  RSF C-index: {rsf_c}", flush=True)
    print(f"{'='*50}", flush=True)


if __name__ == "__main__":
    main()
