import joblib
import pandas as pd
from lifelines import KaplanMeierFitter
from lifelines.statistics import logrank_test

SEGMENT_COLS = {
    "grade": ["A", "B", "C", "D", "E", "F", "G"],
    "term": [36, 60],
    "purpose": ["debt_consolidation", "credit_card", "home_improvement",
                "major_purchase", "small_business", "medical", "other", "vacation"],
    "home_ownership": ["RENT", "OWN", "MORTGAGE", "OTHER"],
}


class KaplanMeierModel:
    def __init__(self):
        self._curves: dict = {}
        self._logrank_pvalues: dict = {}
        self._fitted = False

    def fit(self, df: pd.DataFrame) -> "KaplanMeierModel":
        T, E = df["duration_months"], df["event"]
        for col, values in SEGMENT_COLS.items():
            if col not in df.columns:
                continue
            groups = []
            for val in values:
                mask = df[col] == val
                if mask.sum() < 5:
                    continue
                kmf = KaplanMeierFitter()
                kmf.fit(T[mask], E[mask], label=str(val))
                curve = []
                sf = kmf.survival_function_
                ci = kmf.confidence_interval_survival_function_
                for t in sf.index:
                    curve.append({
                        "month": int(t),
                        "probability": round(float(sf.loc[t].iloc[0]), 4),
                        "lower": round(float(ci.iloc[ci.index.get_loc(t), 0]), 4),
                        "upper": round(float(ci.iloc[ci.index.get_loc(t), 1]), 4),
                    })
                self._curves[(col, str(val))] = curve
                groups.append((T[mask], E[mask]))
            if len(groups) >= 2:
                r = logrank_test(groups[0][0], groups[1][0],
                                 groups[0][1], groups[1][1])
                self._logrank_pvalues[col] = round(float(r.p_value), 4)
        self._fitted = True
        return self

    def predict_segment(self, segment_type: str, segment_value: str) -> list[dict]:
        key = (segment_type, str(segment_value))
        return self._curves.get(key, [])

    def get_logrank_pvalue(self, segment_type: str) -> float:
        return self._logrank_pvalues.get(segment_type, 1.0)

    def save(self, path: str) -> None:
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: str) -> "KaplanMeierModel":
        return joblib.load(path)
