import pytest
import pandas as pd
import numpy as np
from src.data.loader import load_raw
from src.data.survival_formatter import make_survival_df
from src.models.kaplan_meier import KaplanMeierModel
from src.data.preprocessor import Preprocessor
from src.models.cox_ph import CoxModel
from src.models.rsf import RSFModel


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


@pytest.fixture(scope="session")
def model_df(raw_df):
    """Fully preprocessed df with duration_months and event."""
    df = make_survival_df(raw_df.copy())
    p = Preprocessor()
    features = p.fit_transform(raw_df.copy())
    features["duration_months"] = df["duration_months"].values
    features["event"] = df["event"].values
    return features.dropna(subset=["duration_months", "event"])


def test_cox_fits(model_df):
    cox = CoxModel()
    cox.fit(model_df)
    assert cox._fitted


def test_cox_predict_returns_curve(model_df):
    cox = CoxModel()
    cox.fit(model_df)
    X = model_df.drop(columns=["duration_months", "event"]).iloc[:1]
    curve = cox.predict_survival(X)
    assert isinstance(curve, list)
    assert all("month" in p and "probability" in p for p in curve)


def test_cox_hazard_ratios(model_df):
    cox = CoxModel()
    cox.fit(model_df)
    hrs = cox.get_hazard_ratios()
    assert isinstance(hrs, dict)
    assert len(hrs) > 0
    for k, v in hrs.items():
        assert "hr" in v and "lower" in v and "upper" in v


def test_rsf_fits(model_df):
    rsf = RSFModel()
    rsf.fit(model_df, subsample_n=40)
    assert rsf._fitted


def test_rsf_predict_returns_curve(model_df):
    rsf = RSFModel()
    rsf.fit(model_df, subsample_n=40)
    X = model_df.drop(columns=["duration_months", "event"]).iloc[:1]
    curve = rsf.predict_survival(X)
    assert isinstance(curve, list)
    assert all("month" in p and "probability" in p for p in curve)


def test_rsf_feature_importance(model_df):
    rsf = RSFModel()
    rsf.fit(model_df, subsample_n=40)
    imp = rsf.get_feature_importance()
    assert isinstance(imp, dict)
    assert len(imp) > 0
