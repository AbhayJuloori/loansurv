import numpy as np
import pandas as pd


def calibration_data(model, df: pd.DataFrame, times: list[int] = [12, 36]) -> dict[int, dict]:
    """Returns predicted vs observed survival at fixed time horizons (10 bins)."""
    df = df.dropna(subset=["duration_months", "event"])
    X = df.drop(columns=["duration_months", "event"], errors="ignore")
    result = {}
    for t in times:
        preds = []
        for i in range(len(df)):
            curve = model.predict_survival(X.iloc[[i]])
            prob = next((p["probability"] for p in curve if p["month"] >= t),
                        curve[-1]["probability"] if curve else 0.5)
            preds.append(prob)
        preds = np.array(preds)
        bins = np.percentile(preds, np.linspace(0, 100, 11))
        bin_ids = np.digitize(preds, bins[1:-1])
        predicted, observed = [], []
        for b in range(10):
            mask = bin_ids == b
            if mask.sum() == 0:
                continue
            predicted.append(float(preds[mask].mean()))
            obs_rate = float((
                (df["duration_months"].values[mask] > t) |
                ((df["duration_months"].values[mask] <= t) & (df["event"].values[mask] == 0))
            ).mean())
            observed.append(obs_rate)
        result[t] = {"predicted": predicted, "observed": observed}
    return result
