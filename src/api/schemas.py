from pydantic import BaseModel, Field
from typing import Optional


class BorrowerFeatures(BaseModel):
    grade: str = Field(..., description="A-G")
    term: int = Field(..., description="36 or 60")
    annual_inc: float = Field(..., gt=0)
    dti: float = Field(..., ge=0)
    emp_length: Optional[str] = None
    home_ownership: str = "RENT"
    purpose: str = "debt_consolidation"
    loan_amnt: float = Field(..., gt=0)
    int_rate: float = Field(..., gt=0)
    revol_util: Optional[float] = None
    revol_bal: float = 0.0
    fico_range_low: float = 660.0
    fico_range_high: float = 664.0
    pub_rec: float = 0.0
    delinq_2yrs: float = 0.0
    open_acc: float = 10.0
    earliest_cr_line: Optional[str] = "Jan-2010"


class SurvivalPoint(BaseModel):
    month: int
    probability: float


class PredictionResponse(BaseModel):
    survival_curve: list[SurvivalPoint]
    median_survival_months: Optional[int]
    default_prob_12m: float
    default_prob_36m: float
    risk_percentile: int
    hazard_ratios: dict[str, dict]


class CohortResponse(BaseModel):
    segment: str
    curve: list[dict]
    logrank_pvalue: Optional[float] = None


class ModelInfoResponse(BaseModel):
    training_date: str
    n_training_rows: int
    c_index: dict[str, float]
    brier_scores: dict
    features: list[str]
