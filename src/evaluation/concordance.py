import pandas as pd
from lifelines.utils import concordance_index


def harrell_c_index(model, df: pd.DataFrame) -> float:
    """Compute Harrell's C-index. model must have predict_survival(X)."""
    X = df.drop(columns=["duration_months", "event"], errors="ignore")
    T = df["duration_months"]
    E = df["event"]
    risk_scores = []
    for i in range(len(df)):
        curve = model.predict_survival(X.iloc[[i]])
        t36 = next((p["probability"] for p in curve if p["month"] >= 36), curve[-1]["probability"] if curve else 0.5)
        risk_scores.append(1 - t36)
    return round(float(concordance_index(T, [-r for r in risk_scores], E)), 4)
