"""
Usage:
    python scripts/train.py --data "/path/to/accepted_2007_to_2018Q4.csv"

Outputs to models/:
    preprocessor.joblib, km_segments.joblib,
    cox_ph.joblib, rsf.joblib, model_metadata.json
"""
import argparse
import json
import os
import random
import numpy as np
import pandas as pd

from src.data.loader import load_raw
from src.data.survival_formatter import make_survival_df
from src.data.preprocessor import Preprocessor
from src.models.kaplan_meier import KaplanMeierModel
from src.models.cox_ph import CoxModel
from src.models.rsf import RSFModel
from src.evaluation.concordance import harrell_c_index
from src.evaluation.brier_score import brier_scores
from src.evaluation.calibration import calibration_data

MODELS_DIR = "models"


def main(data_path: str):
    os.makedirs(MODELS_DIR, exist_ok=True)
    print("Loading raw data...")
    raw = load_raw(data_path)
    print(f"  {len(raw):,} rows loaded")

    print("Computing survival target...")
    survival = make_survival_df(raw.copy())
    print(f"  {len(survival):,} rows after filtering, event rate: {survival['event'].mean():.3f}")

    print("Fitting preprocessor...")
    preprocessor = Preprocessor()
    features = preprocessor.fit_transform(raw.copy())
    features["duration_months"] = survival["duration_months"]
    features["event"] = survival["event"]
    model_df = features.dropna(subset=["duration_months", "event"])

    preprocessor.save(f"{MODELS_DIR}/preprocessor.joblib")
    print(f"  Preprocessor saved. {model_df.shape[1]} features.")

    os.makedirs("data/processed", exist_ok=True)
    model_df.to_parquet("data/processed/loans.parquet", index=False)
    print("  Parquet saved to data/processed/loans.parquet")

    print("Fitting Kaplan-Meier (uses full dataset + raw grade/term/purpose/home_ownership)...")
    km_df = survival.copy()
    for col in ["grade", "term", "purpose", "home_ownership"]:
        if col in raw.columns:
            km_df[col] = raw[col].values[:len(km_df)]
    km = KaplanMeierModel()
    km.fit(km_df)
    km.save(f"{MODELS_DIR}/km_segments.joblib")
    print("  KM saved.")

    print("Fitting Cox PH (full dataset)...")
    cox = CoxModel(penalizer=0.1)
    cox.fit(model_df)
    cox.save(f"{MODELS_DIR}/cox_ph.joblib")
    print(f"  Cox saved. C-index: {cox.c_index()}")

    print("Fitting RSF (stratified 200k subsample)...")
    rsf = RSFModel()
    rsf.fit(model_df, subsample_n=200_000)
    rsf.save(f"{MODELS_DIR}/rsf.joblib")
    print("  RSF saved.")

    print("Computing evaluation metrics on 5k holdout...")
    holdout = model_df.sample(5000, random_state=42)
    cox_c = harrell_c_index(cox, holdout)
    rsf_c = harrell_c_index(rsf, holdout)
    cox_brier = brier_scores(cox, holdout, times=[12, 24, 36])
    rsf_brier = brier_scores(rsf, holdout, times=[12, 24, 36])
    cox_cal = calibration_data(cox, holdout, times=[12, 36])
    rsf_cal = calibration_data(rsf, holdout, times=[12, 36])

    ref_sample = rsf_brier
    ref_probs = []
    sample_for_ref = holdout.sample(min(1000, len(holdout)), random_state=1)
    for i in range(len(sample_for_ref)):
        X = sample_for_ref.drop(columns=["duration_months", "event"]).iloc[[i]]
        curve = rsf.predict_survival(X)
        p36 = next((p["probability"] for p in curve if p["month"] >= 36),
                   curve[-1]["probability"] if curve else 0.5)
        ref_probs.append(round(1 - p36, 4))

    metadata = {
        "training_date": pd.Timestamp.now().isoformat(),
        "n_training_rows": len(model_df),
        "event_rate": round(float(model_df["event"].mean()), 4),
        "models": {
            "cox_ph": {"c_index": cox_c, "brier_scores": cox_brier,
                       "calibration": cox_cal,
                       "hazard_ratios": cox.get_hazard_ratios()},
            "rsf": {"c_index": rsf_c, "brier_scores": rsf_brier,
                    "calibration": rsf_cal,
                    "feature_importance": rsf.get_feature_importance()},
        },
        "risk_percentile_sample": ref_probs,
        "features": preprocessor._output_cols(),
    }
    with open(f"{MODELS_DIR}/model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"  Metadata saved. Cox C-index={cox_c}, RSF C-index={rsf_c}")
    print("Training complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Path to raw CSV")
    args = parser.parse_args()
    main(args.data)
