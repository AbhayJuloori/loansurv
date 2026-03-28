"""
Run evaluation on already-trained models and write model_metadata.json.
Usage: PYTHONPATH=. python3 scripts/evaluate.py
"""
import json
import joblib
import numpy as np
import pandas as pd

from src.evaluation.concordance import harrell_c_index
from src.evaluation.brier_score import brier_scores
from src.evaluation.calibration import calibration_data

MODELS_DIR = "models"

def main():
    print("Loading models...")
    preprocessor = joblib.load(f"{MODELS_DIR}/preprocessor.joblib")
    cox  = joblib.load(f"{MODELS_DIR}/cox_ph.joblib")
    rsf  = joblib.load(f"{MODELS_DIR}/rsf.joblib")

    print("Loading processed parquet...")
    df = pd.read_parquet("data/processed/loans.parquet")
    print(f"  {len(df):,} rows, event rate: {df['event'].mean():.3f}")

    print("Sampling 5k holdout...")
    holdout = df.sample(5000, random_state=42)

    print("Computing Cox C-index...")
    cox_c = harrell_c_index(cox, holdout)
    print(f"  Cox C-index: {cox_c}")

    print("Computing RSF C-index...")
    rsf_c = harrell_c_index(rsf, holdout)
    print(f"  RSF C-index: {rsf_c}")

    print("Computing Brier scores...")
    cox_brier = brier_scores(cox, holdout, times=[12, 24, 36])
    rsf_brier = brier_scores(rsf, holdout, times=[12, 24, 36])
    print(f"  Cox Brier: {cox_brier}")
    print(f"  RSF Brier: {rsf_brier}")

    print("Computing calibration...")
    cox_cal = calibration_data(cox, holdout, times=[12, 36])
    rsf_cal = calibration_data(rsf, holdout, times=[12, 36])

    print("Building risk percentile reference sample (1k rows)...")
    ref_sample = df.sample(min(1000, len(df)), random_state=1)
    ref_probs = []
    X_ref = ref_sample.drop(columns=["duration_months", "event"], errors="ignore")
    for i in range(len(ref_sample)):
        curve = rsf.predict_survival(X_ref.iloc[[i]])
        p36 = next((p["probability"] for p in curve if p["month"] >= 36),
                   curve[-1]["probability"] if curve else 0.5)
        ref_probs.append(round(1 - p36, 4))
    print(f"  Built {len(ref_probs)} reference probabilities")

    metadata = {
        "training_date": pd.Timestamp.now().isoformat(),
        "n_training_rows": len(df),
        "event_rate": round(float(df["event"].mean()), 4),
        "models": {
            "cox_ph": {
                "c_index": cox_c,
                "brier_scores": {str(k): v for k, v in cox_brier.items()},
                "calibration": {str(k): v for k, v in cox_cal.items()},
                "hazard_ratios": cox.get_hazard_ratios(),
            },
            "rsf": {
                "c_index": rsf_c,
                "brier_scores": {str(k): v for k, v in rsf_brier.items()},
                "calibration": {str(k): v for k, v in rsf_cal.items()},
                "feature_importance": rsf.get_feature_importance(),
            },
        },
        "risk_percentile_sample": ref_probs,
        "features": preprocessor._output_cols(),
    }

    out_path = f"{MODELS_DIR}/model_metadata.json"
    with open(out_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"\nSaved {out_path}")
    print(f"  Cox C-index={cox_c}  RSF C-index={rsf_c}")

if __name__ == "__main__":
    main()
