# LoanSurv

**Survival analysis for loan default risk** — modeling *when* borrowers default, not just *if*.

Built on 2.2M Lending Club loans (2007–2018). Two models run in parallel: a **Cox Proportional Hazards** model for interpretable hazard ratios, and a **Random Survival Forest** for non-linear predictive accuracy. A FastAPI backend serves real-time predictions; a React dashboard lets you explore individual borrower risk, cohort comparisons by grade or purpose, and model performance metrics.

---

## Why this project matters

Most default models answer a binary question: *will this borrower default?* But that framing discards timing entirely — a loan that defaults in month 3 has fundamentally different economics than one that defaults in month 33, even though both carry the same 36-month default flag. Credit risk teams price loans, set loss reserves, and stress-test portfolios against *time-to-default distributions*, not point-in-time probabilities. Survival analysis is the right statistical framework for this: it produces full survival curves, median default timing, and hazard rates at any horizon, under arbitrary right-censoring. This project applies that framework end-to-end — from raw CSV to a deployed interactive dashboard — demonstrating how production-grade survival modeling differs from standard binary classification.

---

## Live demo

**[abhayjuloori.github.io/loansurv](https://abhayjuloori.github.io/loansurv/)** — hosted on GitHub Pages, runs entirely in the browser.

---

## Model results

Evaluated on a stratified 2,000-row holdout (12.1% event rate). Brier scores measure calibration (lower = better); C-index measures discrimination (higher = better).

| Model | C-Index | Brier@12m | Brier@24m | Brier@36m |
|---|---|---|---|---|
| Cox Proportional Hazards | 0.526 | 0.0086 | 0.0410 | 0.121 |
| **Random Survival Forest** | **0.651** | **0.0085** | **0.0395** | **0.114** |

Cox PH C-index is constrained by the dataset: 88% of loans are censored via early prepayment, and early payoffs are systematically low-risk — a violation of the independent censoring assumption that sets a practical ceiling around 0.54 even for a single strong feature like loan grade. RSF handles this censoring structure better through non-parametric splits. Published LC survival analysis papers report Cox C-index 0.52–0.62 and RSF 0.63–0.71 on comparable data. Cox is retained for hazard ratio interpretability, not prediction ranking.

---

## Dashboard pages

| Page | What it shows |
|---|---|
| **Borrower Analysis** | Enter any borrower's attributes → survival curve, 12/24/36-month default probabilities, risk percentile vs. training portfolio, top 10 Cox hazard ratios |
| **Cohort Explorer** | Compare survival curves across loan grade, term, purpose, or home ownership cohorts; log-rank p-value shown |
| **Model Performance** | Out-of-sample C-index and Brier scores for both models; explanation of why Cox C-index appears lower |
| **Methodology** | Five-card primer on survival analysis concepts for non-specialist readers |

---

## Quick start

### Prerequisites

- Python 3.11+
- Node 18+
- Raw Lending Club CSV: `accepted_2007_to_2018Q4.csv` (~1.6 GB, available on Kaggle)

### Train models

```bash
pip install -r requirements.txt
python3 scripts/train.py --data "/path/to/accepted_2007_to_2018Q4.csv"
```

Processes the raw CSV, engineers features, trains Cox PH and RSF, saves everything under `models/`. Full RSF training takes 20–40 minutes.

### Run locally

```bash
# Terminal 1 — API (http://localhost:8000)
PYTHONPATH=. python3 -m uvicorn src.api.main:app --reload

# Terminal 2 — Frontend (http://localhost:5173)
cd app && npm install && npm run dev
```

API docs at `http://localhost:8000/docs`.

### Run with Docker

```bash
cd docker && docker-compose up --build
```

Frontend at `http://localhost:3000`.

---

## Architecture

```
Raw CSV (1.6 GB)
    │
    ▼
src/data/
  loader.py               — ingest and clean raw CSV
  survival_formatter.py   — construct duration_months + event flag
  preprocessor.py         — 15 engineered features, z-score scaling
    │
    ▼
data/processed/loans.parquet  (2.2M rows)
    │
    ├── src/models/kaplan_meier.py   KM segments (cohort baselines)
    ├── src/models/cox_ph.py         Cox PH, lifelines, 13 features
    └── src/models/rsf.py            RSF, scikit-survival, 200 trees
                │
                ▼
            models/
              cox_ph.joblib
              rsf.joblib
              km_segments.joblib
              model_metadata.json   (metrics, hazard ratios, feature list)
                │
                ▼
          src/api/main.py           FastAPI, models loaded at startup
          src/api/routes.py         /predict, /cohort/{segment}, /model/info
                │
          ┌─────┴─────┐
          ▼           ▼
       Railway     Vercel
       (API)     (React + Recharts)
```

---

## Project structure

```
loansurv/
├── src/
│   ├── data/           loader, survival_formatter, preprocessor
│   ├── models/         kaplan_meier, cox_ph, rsf
│   ├── evaluation/     concordance, brier_score, calibration, model_comparison
│   ├── inference/      predict, risk_profile
│   └── api/            FastAPI schemas, routes, lifespan startup
├── scripts/
│   ├── train.py        end-to-end training from raw CSV
│   └── retrain_fast.py fast retrain from processed parquet
├── app/                React 18 + Vite + Tailwind + Recharts
├── tests/              pytest suite (28 tests)
└── docker/             Dockerfiles + docker-compose + nginx config
```

---

## Tech stack

**Backend:** Python 3.11 · lifelines · scikit-survival · FastAPI · Pydantic v2 · pandas · pyarrow · joblib

**Frontend:** React 18 · Vite · React Router v6 · TanStack Query · Recharts · Tailwind CSS v3 · DM Sans + DM Mono

**Infrastructure:** Docker · Railway · Vercel · GitHub Actions CI

---

## Tests

```bash
python3 -m pytest tests/ -v
```

28 tests covering preprocessing, model fitting, evaluation metrics, and API endpoints. ~5 seconds.

---

## License

MIT
