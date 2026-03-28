import numpy as np
import pandas as pd
from sksurv.metrics import brier_score as sksurv_brier
from sksurv.util import Surv


def brier_scores(model, df: pd.DataFrame, times: list[int] = [12, 24, 36]) -> dict[int, float]:
    """Time-dependent Brier score at specified time points."""
    df = df.dropna(subset=["duration_months", "event"])
    X = df.drop(columns=["duration_months", "event"], errors="ignore")
    y = Surv.from_arrays(
        event=df["event"].astype(bool).values,
        time=df["duration_months"].astype(float).values,
    )
    min_time = float(df["duration_months"].min())
    max_time = float(df["duration_months"].max())
    valid_times = [t for t in times if min_time <= t < max_time]
    if not valid_times:
        return {}

    surv_probs = []
    for i in range(len(df)):
        curve = model.predict_survival(X.iloc[[i]])
        row = []
        for t in valid_times:
            prob = next((p["probability"] for p in curve if p["month"] >= t),
                        curve[-1]["probability"] if curve else 0.5)
            row.append(prob)
        surv_probs.append(row)

    surv_matrix = np.array(surv_probs, dtype=float)
    # Replace NaN/inf with 1.0 (no-event probability fallback) so sksurv doesn't reject
    surv_matrix = np.where(np.isfinite(surv_matrix), surv_matrix, 1.0)
    surv_matrix = np.clip(surv_matrix, 0.0, 1.0)
    _, scores = sksurv_brier(y, y, surv_matrix, valid_times)
    return {t: round(float(s), 4) for t, s in zip(valid_times, scores)}
