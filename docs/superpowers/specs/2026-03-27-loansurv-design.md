# LoanSurv — Design Specification
**Date:** 2026-03-27
**Status:** Approved

---

## 1. Project Overview

**LoanSurv** is a full-stack survival analysis system that models *when* a borrower will default, not just *if*. It produces time-to-event curves, hazard rates, and risk stratification for portfolio management, built as a portfolio-quality project demonstrating statistical depth, production engineering discipline, and a professional frontend.

**One-liner:** Survival analysis for loan default timing — KM estimator, Cox PH, and Random Survival Forest on 1.8M Lending Club loans, served via FastAPI, visualized in React.

---

## 2. Data

- **Source:** `accepted_2007_to_2018Q4.csv` (1.6GB, ~1.8M loans, Lending Club)
- **Location (local only, gitignored):** `/Users/abhayjuloori/projects/Lending Club Loan Data/accepted_2007_to_2018q4.csv/accepted_2007_to_2018Q4.csv`
- **Processed output:** `data/processed/loans.parquet` (gitignored)

### Survival Target
```
event = 1  →  loan_status in ["Default", "Charged Off"]
event = 0  →  loan_status in ["Fully Paid", "Current"]
duration_months = months between issue_d and (last_pymnt_d OR Dec 2018 cutoff)
```
Loans with `duration_months <= 0` are dropped.

### Leakage Columns (dropped before any modeling)
`total_pymnt`, `total_rec_prncp`, `total_rec_int`, `total_rec_late_fee`, `recoveries`,
`collection_recovery_fee`, `out_prncp`, `out_prncp_inv`, `last_pymnt_amnt`, `next_pymnt_d`,
`last_pymnt_d`, `last_credit_pull_d`

### Engineered Features (18 total)

| Feature | Transform |
|---|---|
| `fico_mid` | avg(fico_range_low, fico_range_high) |
| `log_annual_inc` | log1p, then standardize |
| `income_to_loan` | annual_inc / loan_amnt, standardize |
| `credit_line_age` | months since earliest_cr_line, standardize |
| `grade` | ordinal A=1..G=7 |
| `term` | binary 36=0, 60=1 |
| `home_ownership` | one-hot: Rent/Own/Mortgage/Other |
| `purpose` | one-hot: top 6 + Other |
| `dti` | cap 99th pct, standardize |
| `int_rate` | standardize |
| `revol_util` | impute median, standardize |
| `revol_bal` | log1p, standardize |
| `loan_amnt` | standardize |
| `pub_rec` | cap at 5 |
| `delinq_2yrs` | cap at 5 |
| `emp_length` | parse to numeric years, impute median, standardize |
| `open_acc` | standardize |
| `fico_mid` | standardize |

**Preprocessor artifact:** `models/preprocessor.joblib` — fitted scalers/encoders saved at training time, loaded by the API for inference-time transforms.

---

## 3. Architecture & Data Flow

```
Raw CSV (1.6GB, gitignored)
    │
    ▼
src/data/loader.py              → load, drop leaky cols, basic type fixes
src/data/preprocessor.py        → feature engineering, encoding, imputation
src/data/survival_formatter.py  → build (duration_months, event) pairs
    │
    ▼
data/processed/loans.parquet    (gitignored, ~200MB)
    │
    ┌──────────────┴──────────────┐
    ▼                             ▼
notebooks/ (exploration)     src/models/
                             kaplan_meier.py
                             cox_ph.py
                             rsf.py
                                 │
                                 ▼
                             models/
                             ├── cox_ph.joblib
                             ├── rsf.joblib
                             ├── km_segments.joblib
                             ├── preprocessor.joblib
                             └── model_metadata.json
                                 │
                                 ▼
                             src/api/main.py (FastAPI)
                             loads all models at startup
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
              Railway (API :8000)       Vercel (React)
```

**Key constraints:**
- `src/` is the single source of truth — notebooks call `src/` functions, never duplicate logic
- All models loaded once at API startup via FastAPI `lifespan` context manager
- `models/` tracked via Git LFS for `.joblib` artifacts

---

## 4. Project Structure

```
loansurv/
├── README.md
├── LICENSE
├── pyproject.toml
├── requirements.txt
├── .env.example
├── .gitignore
│
├── data/
│   ├── raw/                        # gitignored
│   ├── processed/                  # gitignored
│   └── data_dictionary.md
│
├── notebooks/
│   ├── 01_eda.ipynb
│   ├── 02_survival_eda.ipynb
│   ├── 03_modeling.ipynb
│   └── 04_evaluation.ipynb
│
├── src/
│   ├── data/
│   │   ├── loader.py
│   │   ├── preprocessor.py
│   │   └── survival_formatter.py
│   ├── models/
│   │   ├── kaplan_meier.py
│   │   ├── cox_ph.py
│   │   └── rsf.py
│   ├── evaluation/
│   │   ├── concordance.py
│   │   ├── brier_score.py
│   │   ├── calibration.py
│   │   └── model_comparison.py
│   ├── inference/
│   │   ├── predict.py
│   │   └── risk_profile.py
│   └── api/
│       ├── main.py
│       ├── schemas.py
│       └── routes.py
│
├── models/                         # Git LFS
│   ├── cox_ph.joblib
│   ├── rsf.joblib
│   ├── km_segments.joblib
│   ├── preprocessor.joblib
│   └── model_metadata.json
│
├── app/                            # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── BorrowerAnalysis.jsx
│   │   │   ├── CohortExplorer.jsx
│   │   │   ├── ModelPerformance.jsx
│   │   │   └── Methodology.jsx
│   │   ├── components/
│   │   │   ├── Nav.jsx
│   │   │   ├── BorrowerForm.jsx
│   │   │   ├── MetricStrip.jsx
│   │   │   ├── SurvivalCurve.jsx
│   │   │   ├── HazardRatioChart.jsx
│   │   │   ├── CohortComparison.jsx
│   │   │   └── ModelDashboard.jsx
│   │   ├── hooks/
│   │   │   └── usePrediction.js
│   │   └── utils/
│   │       └── chartHelpers.js
│   ├── package.json
│   └── vite.config.js
│
├── tests/
│   ├── conftest.py                 # 50-row synthetic fixture
│   ├── test_preprocessor.py
│   ├── test_models.py
│   ├── test_evaluation.py
│   └── test_api.py
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
│
├── .github/
│   └── workflows/
│       └── test.yml
│
└── docs/
    ├── methodology.md
    ├── feature_engineering.md
    ├── model_card.md
    └── superpowers/specs/
        └── 2026-03-27-loansurv-design.md
```

---

## 5. Models

### Model A — Kaplan-Meier
- Library: `lifelines`
- Non-parametric baseline, no covariates
- Pre-computed at training for all segments: grade (A–G), term (36/60), purpose (top 6)
- Log-rank tests computed and stored per segment pair
- Stored as `km_segments.joblib`, served as static lookups from the API
- Powers the Cohort Explorer page entirely

### Model B — Cox Proportional Hazards
- Library: `lifelines.CoxPHFitter`
- Schoenfeld residual test for PH violations — stratify violating features rather than include as covariates
- Hazard ratios + 95% CIs stored in `model_metadata.json`
- Powers the hazard ratio waterfall chart on the Borrower Analysis page
- Optional model for `/predict` endpoint via `?model=cox_ph`

### Model C — Random Survival Forest
- Library: `scikit-survival.RandomSurvivalForest`
- Hyperparameters: `n_estimators=300`, `max_features="sqrt"`, `min_samples_leaf=15`
- Permutation feature importance stored in `model_metadata.json`
- **Default model for `/predict` endpoint** — best discrimination
- No proportional hazards assumption required

### DeepSurv
- **Explicitly excluded.** Three-model progression (non-parametric → semi-parametric → ML) is the complete story.

---

## 6. Evaluation (computed once at training)

| Metric | Description |
|---|---|
| Harrell's C-index | Discrimination — all three models |
| Time-dependent Brier score | Calibration at t=12, 24, 36 months |
| Calibration curves | Predicted vs observed at t=12, 36 months |

Results stored in `model_metadata.json`, surfaced on the Model Performance page.

---

## 7. API (FastAPI)

### Endpoints

```
POST   /predict              → survival curve for a borrower (RSF default, ?model=cox_ph)
GET    /predict/example      → pre-filled example borrower JSON (self-documenting)
GET    /cohort/{segment}     → pre-computed KM curve + CI for a segment
GET    /model/info           → metadata, C-index, Brier scores, training date
GET    /health               → {"status": "ok"}
```

### POST /predict — Response Shape
```json
{
  "survival_curve": [{"month": 1, "probability": 0.99}, ...],
  "median_survival_months": 34,
  "default_prob_12m": 0.08,
  "default_prob_36m": 0.22,
  "risk_percentile": 73,
  "hazard_ratios": {"dti": 1.12, "grade": 1.85, ...}
}
```

### Implementation Details
- Models loaded once at startup via `lifespan` context manager
- Pydantic v2 for all request/response validation
- `preprocessor.joblib` applied to incoming data before inference
- CORS configured for Vercel frontend domain
- `risk_percentile` from stored sample of 10k training predictions in metadata — O(1), no recompute

---

## 8. Frontend

### Design System

**Colors:**
| Token | Value | Usage |
|---|---|---|
| `--bg` | `#FAF8F5` | Page background |
| `--surface` | `#F4F1EC` | Form panel, metric cards |
| `--text-primary` | `#1C1917` | Headings, values, chart curve |
| `--text-muted` | `#78716C` | Labels, axis ticks, field labels |
| `--border` | `#E2DDD8` | Borders, grid lines, dividers |
| `--accent` | `#C2692A` | Median line, slider thumb, active nav, CTA |
| `--risk-red` | `#DC2626` | High default probability, right hazard bars |
| `--safe-green` | `#16A34A` | Low risk numbers, left hazard bars |

**Rules:**
- No blue anywhere
- No shadows (box-shadow, drop-shadow)
- No gradients
- Max border-radius: 4px
- Red/green reserved strictly for risk indicators — never decorative

**Typography:**
- UI + Body: **DM Sans** (Google Fonts) — 300 body, 400 labels, 500 headings
- Numbers + metrics: **DM Mono** (Google Fonts) — all numeric displays, axis ticks, metric values
- Base sizes: 13px UI chrome, 12px form labels, 11px secondary annotations, 10px axis labels

**Transitions:** `transition: all 0.15s ease` on interactive elements only (slider thumb, dropdown focus, active nav link). No animation elsewhere.

### Pages

**1. Borrower Analysis (hero)**
- Left panel: 280px fixed, Bloomberg-density form — 8px between fields, no section padding. Sliders for continuous (DTI, FICO, income, int_rate), dropdowns for categoricals (grade, term, purpose, home_ownership).
- Right panel: scrollable column — (1) MetricStrip pinned at top, (2) SurvivalCurve ~220px height, (3) HazardRatioChart below. No dead space.
- Live updates: 300ms debounce on every input change, curve animates on new prediction.

**2. Cohort Explorer**
- Dropdown to select variable (Grade / Term / Purpose / Home Ownership)
- Overlaid KM curves, one per segment, color-coded with clean legend
- Toggle: Survival Function ↔ Cumulative Hazard
- Log-rank p-value as a badge

**3. Model Performance**
- C-index horizontal bar comparison (all 3 models)
- Brier score over time (line chart, all models overlaid)
- Calibration curves at t=12m and t=36m
- RSF feature importance ranking (horizontal bars)

**4. Methodology**
- Two-column long-form on desktop, single on mobile
- Plain-English explainers: survival analysis, three models, evaluation metrics
- Links to GitHub and model card

### Component Specs

**Nav:** 48px, 1px `--border` bottom, no shadow. Logo left: `Loan` in `--text-primary`, `Surv` in `--accent`, DM Mono. Page links right, 13px DM Sans. Active page: `--text-primary` + 2px `--accent` underline.

**MetricStrip:** Four cards in a horizontal strip, 1px `--border` separators, no outer box. Labels: 10px DM Mono uppercase `--text-muted`. Values: 22px DM Mono `--text-primary`. Risk percentile card wider, value 36px.

**SurvivalCurve:** Flush in panel, no chart border. Grid lines: `--border` dashed. Curve: 2px `--text-primary` line. Confidence band: `rgba(28,25,23,0.07)`. Median line: 1px dashed `--accent` with `"28 mo"` label in 10px DM Mono `--accent`.

**HazardRatioChart:** Centered pivot line in `--border`. Right bars (risk): `--risk-red` 70% opacity. Left bars (protective): `--safe-green` 70% opacity. Feature name: 11px DM Mono `--text-muted`. Value: right-aligned same color. No bar track fill.

**Sliders:** Track `--border` 3px height. Thumb: 14px circle `--accent`. No browser default styling.

**Dropdowns:** `--surface` background, 1px `--border`, 4px radius. Focus: border becomes `--accent`.

### Tech Stack
React 18, Vite, React Router v6, React Query, Zustand, Recharts, Tailwind CSS v4, Axios, DM Sans + DM Mono (Google Fonts)

---

## 9. Testing

### Strategy
- 50-row synthetic fixture in `conftest.py` matching the real CSV schema — no file dependencies
- No mocks on the data pipeline — tests exercise real `src/` code against the fixture
- ~60 tests total across 4 files

### Files
| File | Coverage |
|---|---|
| `test_preprocessor.py` | Feature engineering correctness, no leakage columns survive, nulls handled |
| `test_models.py` | KM fits, Cox PH converges, RSF produces valid survival curves on fixture |
| `test_evaluation.py` | C-index in [0.5, 1.0], Brier score in [0, 1], calibration shape |
| `test_api.py` | All 5 endpoints, valid inputs, edge cases, Pydantic schema validation |

### GitHub Actions
Two parallel jobs on push + pull_request:
1. Python 3.11 → `pip install -r requirements.txt` → `pytest -v`
2. Node 20 → `npm install` → `vite build`

---

## 10. Deployment

| Layer | Platform | Notes |
|---|---|---|
| API | Railway | Auto-deploy from GitHub, `Dockerfile.api`, `models/` mounted |
| Frontend | Vercel | Auto-deploy from GitHub, `app/` root |
| Local dev | Docker Compose | `docker-compose.yml` with api + frontend services |

`.env.example` documents required vars: `MODEL_PATH`, `CORS_ORIGIN`, `API_URL` (frontend).

---

## 11. What Makes This Stand Out

1. **Survival analysis is rare** in DS portfolios — modeling *when* not *if*
2. **Three-model progression** with rigorous evaluation (C-index + Brier + calibration)
3. **PH assumption diagnostics** — Schoenfeld residuals, stratification — statistical maturity
4. **Full-stack delivery** — not just notebooks
5. **Hazard ratio interpretation** directly actionable for credit risk teams
6. **Full test suite + CI** on a portfolio ML project — genuinely rare
7. **Frontend designed as a professional analytical tool**, not an AI demo

---

## 12. Explicit Exclusions

- DeepSurv / pycox / PyTorch — excluded, three models is the complete story
- Competing risks (Fine-Gray) — stretch goal, not in scope
- Time-varying covariates — stretch goal, not in scope
- Portfolio simulation — stretch goal, not in scope
- MLflow — overkill for portfolio, excluded
