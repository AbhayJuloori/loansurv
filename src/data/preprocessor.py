import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import StandardScaler

TOP_PURPOSES = ["debt_consolidation", "credit_card", "home_improvement",
                "major_purchase", "small_business", "medical"]


def _parse_emp_length(series: pd.Series) -> pd.Series:
    mapping = {"< 1 year": 0, "1 year": 1, "2 years": 2, "3 years": 3,
               "4 years": 4, "5 years": 5, "6 years": 6, "7 years": 7,
               "8 years": 8, "9 years": 9, "10+ years": 10}
    return series.map(mapping)


def _parse_lc_date(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, format="%b-%Y", errors="coerce")


class Preprocessor:
    def __init__(self):
        self._scaler = StandardScaler()
        self._revol_util_median = None
        self._emp_length_median = None
        self._fitted = False

    def fit(self, df: pd.DataFrame) -> "Preprocessor":
        df = self._engineer(df)
        self._revol_util_median = df["revol_util"].median()
        self._emp_length_median = df["emp_length"].median()
        df = self._impute(df)
        scale_cols = self._scale_cols()
        self._scaler.fit(df[scale_cols])
        self._fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        df = self._engineer(df)
        df = self._impute(df)
        scale_cols = self._scale_cols()
        df[scale_cols] = self._scaler.transform(df[scale_cols])
        return df[self._output_cols()]

    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        self.fit(df)
        return self.transform(df)

    def _engineer(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df["fico_mid"] = (df["fico_range_low"] + df["fico_range_high"]) / 2
        df["log_annual_inc"] = np.log1p(df["annual_inc"].clip(lower=0))
        df["income_to_loan"] = df["annual_inc"] / df["loan_amnt"].replace(0, np.nan)
        # credit_line_age in months
        if "earliest_cr_line" in df.columns:
            ecl = pd.to_datetime(df["earliest_cr_line"], format="%b-%Y", errors="coerce")
            ref = pd.Timestamp("2018-12-31")
            df["credit_line_age"] = ((ref.year - ecl.dt.year) * 12
                                     + (ref.month - ecl.dt.month)).clip(lower=0)
        else:
            df["credit_line_age"] = 0.0
        df["grade"] = df["grade"].map({"A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6, "G": 7})
        df["revol_bal"] = np.log1p(df["revol_bal"].clip(lower=0))
        df["pub_rec"] = df["pub_rec"].clip(upper=5)
        df["delinq_2yrs"] = df["delinq_2yrs"].clip(upper=5)
        df["emp_length"] = _parse_emp_length(df["emp_length"])
        # purpose: top 6 + other
        if "purpose" in df.columns:
            df["purpose"] = df["purpose"].where(df["purpose"].isin(TOP_PURPOSES), "other")
        return df

    def _impute(self, df: pd.DataFrame) -> pd.DataFrame:
        df["revol_util"] = df["revol_util"].fillna(self._revol_util_median or df["revol_util"].median())
        df["emp_length"] = df["emp_length"].fillna(self._emp_length_median or df["emp_length"].median())
        df["income_to_loan"] = df["income_to_loan"].fillna(df["income_to_loan"].median())
        df["dti"] = df["dti"].clip(upper=df["dti"].quantile(0.99))
        return df

    def _scale_cols(self) -> list[str]:
        return ["fico_mid", "log_annual_inc", "income_to_loan", "credit_line_age",
                "dti", "int_rate", "revol_util", "revol_bal", "loan_amnt",
                "open_acc", "emp_length"]

    def _output_cols(self) -> list[str]:
        return ["fico_mid", "log_annual_inc", "income_to_loan", "credit_line_age",
                "grade", "term", "dti", "int_rate", "revol_util", "revol_bal",
                "loan_amnt", "pub_rec", "delinq_2yrs", "emp_length", "open_acc"]

    def save(self, path: str) -> None:
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: str) -> "Preprocessor":
        return joblib.load(path)
