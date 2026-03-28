import pandas as pd

EVENT_STATUSES = {"Default", "Charged Off"}
CUTOFF_DATE = pd.Timestamp("2018-12-31")
DATE_COLS_TO_DROP = ["issue_d", "last_pymnt_d", "earliest_cr_line", "next_pymnt_d"]


def _parse_lc_date(series: pd.Series) -> pd.Series:
    """Parse Lending Club date strings like 'Jan-2015' to Timestamp."""
    return pd.to_datetime(series, format="%b-%Y", errors="coerce")


def make_survival_df(df: pd.DataFrame) -> pd.DataFrame:
    """Add duration_months and event columns. Drop rows with duration <= 0."""
    df = df.copy()
    issue = _parse_lc_date(df["issue_d"])
    # Use last_pymnt_d if available (events), else cutoff
    if "last_pymnt_d" in df.columns:
        last_pymnt = _parse_lc_date(df["last_pymnt_d"])
        end_date = last_pymnt.fillna(CUTOFF_DATE)
    else:
        end_date = pd.Series(CUTOFF_DATE, index=df.index)
    end_date = end_date.clip(upper=CUTOFF_DATE)

    df["event"] = df["loan_status"].isin(EVENT_STATUSES).astype(int)
    df["duration_months"] = (
        (end_date.dt.year - issue.dt.year) * 12
        + (end_date.dt.month - issue.dt.month)
    ).clip(lower=0)

    df = df[df["duration_months"] > 0].reset_index(drop=True)
    df = df.drop(columns=[c for c in DATE_COLS_TO_DROP if c in df.columns])
    return df
