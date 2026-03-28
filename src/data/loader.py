import pandas as pd

LEAKAGE_COLS = [
    "total_pymnt", "total_rec_prncp", "total_rec_int", "total_rec_late_fee",
    "recoveries", "collection_recovery_fee", "out_prncp", "out_prncp_inv",
    "last_pymnt_amnt", "next_pymnt_d", "last_pymnt_d", "last_credit_pull_d",
]


def load_raw(path: str) -> pd.DataFrame:
    """Load CSV, drop leakage columns, parse term and int_rate."""
    df = pd.read_csv(path, low_memory=False)
    # Drop leakage (only columns that exist)
    df = df.drop(columns=[c for c in LEAKAGE_COLS if c in df.columns])
    # Parse term: " 36 months" → 36
    if "term" in df.columns:
        df["term"] = df["term"].str.extract(r"(\d+)").astype(float).astype("Int64")
    # Parse int_rate: may be string "15.27%" or already float
    if "int_rate" in df.columns:
        df["int_rate"] = (
            df["int_rate"].astype(str).str.replace("%", "").str.strip().astype(float)
        )
    return df
