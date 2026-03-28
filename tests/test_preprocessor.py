import pandas as pd

from src.data.loader import load_raw, LEAKAGE_COLS
from src.data.survival_formatter import make_survival_df
from src.data.preprocessor import Preprocessor


def test_loader_drops_leakage(raw_df, tmp_path):
    csv_path = tmp_path / "test.csv"
    raw_df.to_csv(csv_path, index=False)
    df = load_raw(str(csv_path))
    for col in LEAKAGE_COLS:
        assert col not in df.columns, f"Leakage column {col} survived"


def test_loader_parses_int_rate(raw_df, tmp_path):
    csv_path = tmp_path / "test.csv"
    raw_df.to_csv(csv_path, index=False)
    df = load_raw(str(csv_path))
    assert df["int_rate"].dtype == float


def test_loader_parses_term(raw_df, tmp_path):
    csv_path = tmp_path / "test.csv"
    raw_df.to_csv(csv_path, index=False)
    df = load_raw(str(csv_path))
    assert set(df["term"].unique()).issubset({36, 60})


def test_survival_formatter_adds_columns(raw_df):
    df = make_survival_df(raw_df.copy())
    assert "duration_months" in df.columns
    assert "event" in df.columns


def test_survival_formatter_event_binary(raw_df):
    df = make_survival_df(raw_df.copy())
    assert set(df["event"].unique()).issubset({0, 1})


def test_survival_formatter_drops_zero_duration(raw_df):
    df = make_survival_df(raw_df.copy())
    assert (df["duration_months"] > 0).all()


def test_survival_formatter_drops_date_cols(raw_df):
    df = make_survival_df(raw_df.copy())
    assert "issue_d" not in df.columns
    assert "earliest_cr_line" not in df.columns


def test_preprocessor_output_columns(raw_df):
    p = Preprocessor()
    out = p.fit_transform(raw_df.copy())
    expected = ["fico_mid", "log_annual_inc", "income_to_loan", "credit_line_age",
                "grade", "term", "dti", "int_rate", "revol_util", "revol_bal",
                "loan_amnt", "pub_rec", "delinq_2yrs", "emp_length", "open_acc"]
    for col in expected:
        assert col in out.columns, f"Missing column: {col}"


def test_preprocessor_no_nulls(raw_df):
    p = Preprocessor()
    out = p.fit_transform(raw_df.copy())
    feature_cols = [c for c in out.columns if c not in ("duration_months", "event", "loan_status")]
    assert out[feature_cols].isnull().sum().sum() == 0


def test_preprocessor_save_load(raw_df, tmp_path):
    p = Preprocessor()
    p.fit(raw_df.copy())
    path = str(tmp_path / "preprocessor.joblib")
    p.save(path)
    p2 = Preprocessor.load(path)
    out1 = p.transform(raw_df.copy())
    out2 = p2.transform(raw_df.copy())
    pd.testing.assert_frame_equal(out1, out2)
