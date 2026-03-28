import pytest
from src.data.preprocessor import Preprocessor
from src.data.survival_formatter import make_survival_df
from src.models.cox_ph import CoxModel
from src.models.rsf import RSFModel
from src.evaluation.concordance import harrell_c_index
from src.evaluation.brier_score import brier_scores
from src.evaluation.model_comparison import compare_models


@pytest.fixture(scope="session")
def model_df(raw_df):
    df = make_survival_df(raw_df.copy())
    p = Preprocessor()
    features = p.fit_transform(raw_df.copy())
    features["duration_months"] = df["duration_months"].values
    features["event"] = df["event"].values
    return features.dropna(subset=["duration_months", "event"])


def test_c_index_cox_in_range(model_df):
    cox = CoxModel()
    cox.fit(model_df)
    c = harrell_c_index(cox, model_df)
    assert 0.5 <= c <= 1.0


def test_c_index_rsf_in_range(model_df):
    rsf = RSFModel()
    rsf.fit(model_df, subsample_n=40)
    c = harrell_c_index(rsf, model_df)
    assert 0.5 <= c <= 1.0


def test_brier_scores_in_range(model_df):
    rsf = RSFModel()
    rsf.fit(model_df, subsample_n=40)
    scores = brier_scores(rsf, model_df, times=[6, 12])
    for t, v in scores.items():
        assert 0 <= v <= 1, f"Brier score at t={t} out of range: {v}"


def test_compare_models_keys(model_df):
    cox = CoxModel()
    cox.fit(model_df)
    rsf = RSFModel()
    rsf.fit(model_df, subsample_n=40)
    result = compare_models({"cox": cox, "rsf": rsf}, model_df)
    assert "cox" in result and "rsf" in result
    assert "c_index" in result["cox"]
