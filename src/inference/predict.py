import pandas as pd
from src.data.preprocessor import Preprocessor
from src.models.cox_ph import CoxModel
from src.models.rsf import RSFModel


def predict_borrower(
    raw_features: dict,
    preprocessor: Preprocessor,
    cox_model: CoxModel,
    rsf_model: RSFModel,
    model_type: str = "rsf",
) -> dict:
    """
    Generate full prediction for a single borrower.
    raw_features: dict matching the raw CSV schema (pre-preprocessing).
    Returns: survival_curve, median_survival_months, default_prob_12m/36m,
             hazard_ratios (always from Cox).
    """
    df = pd.DataFrame([raw_features])
    X = preprocessor.transform(df)

    model = rsf_model if model_type == "rsf" else cox_model
    curve = model.predict_survival(X)

    def prob_at(t: int) -> float:
        entry = next((p for p in curve if p["month"] >= t), None)
        return round(1 - (entry["probability"] if entry else curve[-1]["probability"]), 4)

    median = next((p["month"] for p in curve if p["probability"] <= 0.5), None)

    return {
        "survival_curve": curve,
        "median_survival_months": median,
        "default_prob_12m": prob_at(12),
        "default_prob_36m": prob_at(36),
        "hazard_ratios": cox_model.get_hazard_ratios(),
    }
