from fastapi import APIRouter, HTTPException, Query, Request
from src.api.schemas import (
    BorrowerFeatures, PredictionResponse, CohortResponse, ModelInfoResponse
)
from src.inference.predict import predict_borrower
from src.inference.risk_profile import get_risk_percentile

router = APIRouter()

EXAMPLE_BORROWER = {
    "grade": "C", "term": 36, "annual_inc": 65000, "dti": 18.5,
    "emp_length": "5 years", "home_ownership": "RENT",
    "purpose": "debt_consolidation", "loan_amnt": 12000, "int_rate": 13.5,
    "revol_util": 55.0, "revol_bal": 8000, "fico_range_low": 685.0,
    "fico_range_high": 689.0, "pub_rec": 0.0, "delinq_2yrs": 0.0,
    "open_acc": 9.0, "earliest_cr_line": "Jan-2010",
}


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/predict/example")
def predict_example():
    return EXAMPLE_BORROWER


@router.post("/predict", response_model=PredictionResponse)
def predict(features: BorrowerFeatures, request: Request,
            model: str = Query("rsf", pattern="^(rsf|cox_ph)$")):
    state = request.app.state
    result = predict_borrower(
        raw_features=features.model_dump(),
        preprocessor=state.preprocessor,
        cox_model=state.cox_model,
        rsf_model=state.rsf_model,
        model_type=model,
    )
    result["risk_percentile"] = get_risk_percentile(
        result["default_prob_36m"],
        state.metadata.get("risk_percentile_sample", []),
    )
    return result


@router.get("/cohort/{segment}", response_model=CohortResponse)
def cohort(segment: str, request: Request):
    parts = segment.split("_", 1)
    if len(parts) != 2:
        raise HTTPException(400, "Segment format: {type}_{value}")
    seg_type, seg_value = parts
    km = request.app.state.km_model
    val = int(seg_value) if seg_type == "term" else seg_value.replace("_", " ")
    curve = km.predict_segment(seg_type, str(val))
    pvalue = km.get_logrank_pvalue(seg_type)
    return CohortResponse(segment=segment, curve=curve, logrank_pvalue=pvalue)


@router.get("/model/info", response_model=ModelInfoResponse)
def model_info(request: Request):
    meta = request.app.state.metadata
    return ModelInfoResponse(
        training_date=meta.get("training_date", "unknown"),
        n_training_rows=meta.get("n_training_rows", 0),
        c_index={k: v["c_index"] for k, v in meta.get("models", {}).items()},
        brier_scores={k: v["brier_scores"] for k, v in meta.get("models", {}).items()},
        features=meta.get("features", []),
    )
