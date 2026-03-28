import joblib
import pandas as pd
import numpy as np
from lifelines import CoxPHFitter

FEATURE_COLS = [
    "fico_mid", "log_annual_inc", "income_to_loan", "credit_line_age",
    "grade", "term", "dti", "int_rate", "revol_util", "revol_bal",
    "loan_amnt", "pub_rec", "delinq_2yrs", "emp_length", "open_acc",
]


class CoxModel:
    def __init__(self, penalizer: float = 0.1):
        self._penalizer = penalizer
        self._fitter = CoxPHFitter(penalizer=penalizer)
        self._fitted = False
        self._feature_cols: list[str] = []

    def fit(self, df: pd.DataFrame) -> "CoxModel":
        avail = [c for c in FEATURE_COLS if c in df.columns]
        self._feature_cols = avail
        train = self._prepare_frame(df[avail + ["duration_months", "event"]]).dropna()
        self._fitter.fit(
            train,
            duration_col="duration_months",
            event_col="event",
        )
        self._fitted = True
        return self

    def predict_survival(self, X: pd.DataFrame) -> list[dict]:
        X = self._prepare_frame(X[[c for c in self._feature_cols if c in X.columns]])
        sf = self._fitter.predict_survival_function(X)
        col = sf.columns[0]
        return [
            {"month": int(t), "probability": round(float(sf.loc[t, col]), 4)}
            for t in sf.index
        ]

    def _prepare_frame(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        if "term" in df.columns:
            df["term"] = df["term"].astype(str).str.extract(r"(\d+)").astype(float)
        return df

    def get_hazard_ratios(self) -> dict[str, dict]:
        summary = self._fitter.summary
        result = {}
        for feat in summary.index:
            result[feat] = {
                "hr": round(float(np.exp(summary.loc[feat, "coef"])), 4),
                "lower": round(float(np.exp(summary.loc[feat, "coef lower 95%"])), 4),
                "upper": round(float(np.exp(summary.loc[feat, "coef upper 95%"])), 4),
            }
        return result

    def c_index(self) -> float:
        return round(float(self._fitter.concordance_index_), 4)

    def save(self, path: str) -> None:
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: str) -> "CoxModel":
        return joblib.load(path)
