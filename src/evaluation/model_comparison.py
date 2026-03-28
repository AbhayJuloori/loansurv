import pandas as pd
from src.evaluation.concordance import harrell_c_index
from src.evaluation.brier_score import brier_scores


def compare_models(models: dict, df: pd.DataFrame, times: list[int] = [12, 24, 36]) -> dict:
    """Head-to-head evaluation of multiple models."""
    result = {}
    for name, model in models.items():
        result[name] = {
            "c_index": harrell_c_index(model, df),
            "brier_scores": brier_scores(model, df, times),
        }
    return result
