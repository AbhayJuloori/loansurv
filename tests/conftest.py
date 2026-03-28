import pandas as pd
import numpy as np
import pytest


@pytest.fixture(scope="session")
def raw_df():
    """50-row synthetic fixture matching Lending Club accepted CSV schema."""
    np.random.seed(42)
    n = 50
    issue_dates = pd.date_range("2014-01-01", periods=n, freq="ME")
    last_pymnt_dates = pd.date_range("2016-06-01", periods=n, freq="ME")
    earliest_cr = pd.date_range("2000-01-01", periods=n, freq="ME")
    return pd.DataFrame({
        "loan_status": np.random.choice(
            ["Fully Paid", "Charged Off", "Current", "Default"],
            n, p=[0.55, 0.15, 0.20, 0.10]
        ),
        "issue_d": issue_dates.strftime("%b-%Y"),
        "last_pymnt_d": last_pymnt_dates.strftime("%b-%Y"),
        "earliest_cr_line": earliest_cr.strftime("%b-%Y"),
        "term": np.random.choice([" 36 months", " 60 months"], n),
        "grade": np.random.choice(["A", "B", "C", "D", "E", "F", "G"], n),
        "annual_inc": np.random.lognormal(11, 0.5, n),
        "dti": np.random.uniform(0, 35, n),
        "emp_length": np.random.choice(
            ["< 1 year", "1 year", "2 years", "5 years", "10+ years", np.nan], n
        ),
        "home_ownership": np.random.choice(["RENT", "OWN", "MORTGAGE"], n),
        "purpose": np.random.choice(
            ["debt_consolidation", "credit_card", "home_improvement",
             "major_purchase", "small_business", "medical", "vacation"], n
        ),
        "loan_amnt": np.random.uniform(1000, 40000, n),
        "int_rate": np.random.uniform(5.0, 30.0, n),
        "revol_util": np.random.uniform(0, 100, n),
        "fico_range_low": np.random.randint(620, 800, n).astype(float),
        "fico_range_high": (np.random.randint(620, 800, n) + 4).astype(float),
        "pub_rec": np.random.randint(0, 6, n).astype(float),
        "delinq_2yrs": np.random.randint(0, 6, n).astype(float),
        "open_acc": np.random.randint(1, 20, n).astype(float),
        "revol_bal": np.random.uniform(0, 50000, n),
        # Leakage columns — must be dropped by loader
        "total_pymnt": np.random.uniform(0, 40000, n),
        "recoveries": np.zeros(n),
        "out_prncp": np.random.uniform(0, 40000, n),
    })
