import math
import pandas as pd
from lifelines.utils import concordance_index


def harrell_c_index(model, df: pd.DataFrame) -> float:
    """Compute Harrell's C-index. model must have predict_survival(X)."""
    X = df.drop(columns=["duration_months", "event"], errors="ignore")
    T = df["duration_months"].values
    E = df["event"].values
    risk_scores = []
    for i in range(len(df)):
        curve = model.predict_survival(X.iloc[[i]])
        prob = next((p["probability"] for p in curve if p["month"] >= 36),
                    curve[-1]["probability"] if curve else 0.5)
        # Replace NaN/inf with neutral 0.5 so it doesn't poison concordance_index
        risk_scores.append(1 - prob if math.isfinite(prob) else 0.5)

    # Drop rows where risk score is still NaN (shouldn't happen after above, but safety net)
    valid = [(t, r, e) for t, r, e in zip(T, risk_scores, E) if math.isfinite(r)]
    if not valid:
        return float("nan")
    T_v, R_v, E_v = zip(*valid)
    return round(float(concordance_index(T_v, [-r for r in R_v], E_v)), 4)
