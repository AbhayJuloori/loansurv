from src.data.loader import load_raw, LEAKAGE_COLS


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
