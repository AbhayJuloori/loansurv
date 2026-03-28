import joblib
import math
import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
from sksurv.ensemble import RandomSurvivalForest
from sksurv.util import Surv

SUBSAMPLE_N = 200_000
FEATURE_COLS = [
    "fico_mid", "log_annual_inc", "income_to_loan", "credit_line_age",
    "grade", "term", "dti", "int_rate", "revol_util", "revol_bal",
    "loan_amnt", "pub_rec", "delinq_2yrs", "emp_length", "open_acc",
]


class RSFModel:
    def __init__(self):
        self._model = RandomSurvivalForest(
            n_estimators=150,
            max_features="sqrt",
            min_samples_leaf=15,
            n_jobs=-1,
            random_state=42,
        )
        self._feature_cols: list[str] = []
        self._times: np.ndarray = np.array([])
        self._importance_X: np.ndarray = np.array([])
        self._importance_y = None
        self._fitted = False

    def fit(self, df: pd.DataFrame, subsample_n: int = SUBSAMPLE_N,
            random_state: int = 42) -> "RSFModel":
        df = df.dropna(subset=["duration_months", "event"])
        if len(df) > subsample_n:
            events = df[df["event"] == 1]
            non_events = df[df["event"] == 0]
            n_events = min(len(events), int(subsample_n * len(events) / len(df)))
            n_non = subsample_n - n_events
            rng = np.random.default_rng(random_state)
            idx = np.concatenate([
                rng.choice(len(events), n_events, replace=False),
                rng.choice(len(non_events), min(n_non, len(non_events)), replace=False)
            ])
            sample_events = events.iloc[idx[:n_events]]
            sample_non = non_events.iloc[idx[n_events:]]
            df = pd.concat([sample_events, sample_non]).sample(frac=1, random_state=random_state)

        avail = [c for c in FEATURE_COLS if c in df.columns]
        self._feature_cols = avail
        X = self._prepare_frame(df[avail]).fillna(0).values
        y = Surv.from_arrays(
            event=df["event"].astype(bool).values,
            time=df["duration_months"].astype(float).values,
        )
        self._model.fit(X, y)
        self._times = self._model.unique_times_
        self._importance_X = X[: min(len(X), 256)]
        self._importance_y = y[: min(len(y), 256)]
        self._fitted = True
        return self

    def predict_survival(self, X: pd.DataFrame) -> list[dict]:
        feat = [c for c in self._feature_cols if c in X.columns]
        Xv = self._prepare_frame(X[feat]).fillna(0).values
        sf = self._model.predict_survival_function(Xv, return_array=True)
        probs = sf[0]
        return [
            {"month": int(t), "probability": round(float(p), 4) if math.isfinite(float(p)) else 1.0}
            for t, p in zip(self._times, probs)
        ]

    def get_feature_importance(self) -> dict[str, float]:
        try:
            imp = self._model.feature_importances_
        except NotImplementedError:
            result = permutation_importance(
                self._model,
                self._importance_X,
                self._importance_y,
                n_repeats=3,
                random_state=42,
            )
            imp = result.importances_mean
        return {feat: round(float(v), 6) for feat, v in zip(self._feature_cols, imp)}

    def _prepare_frame(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        if "term" in df.columns:
            df["term"] = df["term"].astype(str).str.extract(r"(\d+)").astype(float)
        return df

    def save(self, path: str) -> None:
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: str) -> "RSFModel":
        return joblib.load(path)
