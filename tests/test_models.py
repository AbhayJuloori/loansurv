import pytest
import pandas as pd
import numpy as np
from src.data.loader import load_raw
from src.data.survival_formatter import make_survival_df
from src.models.kaplan_meier import KaplanMeierModel


@pytest.fixture(scope="session")
def km_df(raw_df):
    """Survival df ready for KM (needs grade, term, purpose, home_ownership + duration + event)."""
    df = raw_df.copy()
    # Ensure required cols exist in simple form
    df = make_survival_df(df)
    return df


def test_km_fits(km_df):
    km = KaplanMeierModel()
    km.fit(km_df)
    assert km._fitted


def test_km_predict_segment_returns_curve(km_df):
    km = KaplanMeierModel()
    km.fit(km_df)
    curve = km.predict_segment("grade", "A")
    assert isinstance(curve, list)
    assert all("month" in p and "probability" in p for p in curve)
    assert all(0 <= p["probability"] <= 1 for p in curve)


def test_km_save_load(km_df, tmp_path):
    km = KaplanMeierModel()
    km.fit(km_df)
    km.save(str(tmp_path / "km.joblib"))
    km2 = KaplanMeierModel.load(str(tmp_path / "km.joblib"))
    c1 = km.predict_segment("grade", "A")
    c2 = km2.predict_segment("grade", "A")
    assert c1 == c2
