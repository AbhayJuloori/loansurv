# LoanSurv

Survival analysis for loan default timing — modeling *when* borrowers default, not just *if*.

Built on 1.8M Lending Club loans (2007–2018). Three models evaluated head-to-head: Kaplan-Meier estimator, Cox Proportional Hazards, and Random Survival Forest. Served via FastAPI, visualized in a React frontend designed for portfolio analysis.

---

## Why survival analysis?

Logistic regression gives you a default probability at a fixed horizon. Survival analysis gives you the full time-to-event distribution — survival curves, median default timing, hazard rates at any point. A loan that defaults in month 3 and one that defaults in month 33 have the same 36-month default flag but very different portfolio economics. That distinction is what credit risk teams actually price and reserve against.

---

## Key results

| Model | C-Index | Brier@12m | Brier@24m | Brier@36m |
|---|---|---|---|---|
| Kaplan-Meier | — | baseline, no covariates | | |
| Cox PH | 0.53 | 0.0055 | 0.0362 | 0.0901 |
| **Random Survival Forest** | **0.67** | **0.0055** | **0.0341** | **0.0831** |

RSF outperforms Cox PH on both discrimination (C-index) and calibration (Brier), demonstrating the value of non-parametric ML for non-linear survival modeling. Cox PH is retained for its interpretability — hazard ratios are directly actionable for credit risk teams. Evaluated on 5k held-out loans from 2.2M total (12.1% event rate).

---

## Quick start

**Train models** (requires raw CSV, ~30–60 min for RSF):
```bash
python3 scripts/train.py --data "/path/to/accepted_2007_to_2018Q4.csv"
```

**Run locally (API + frontend separately):**
```bash
# Terminal 1 — API
uvicorn src.api.main:app --reload

# Terminal 2 — Frontend
cd app && npm install && npm run dev
```

Frontend: http://localhost:5173 · API docs: http://localhost:8000/docs

**Run with Docker Compose:**
```bash
cd docker && docker-compose up --build
```
Frontend: http://localhost:3000

---

## Architecture

```
Raw CSV (1.6GB)
    │
    ▼
src/data/  ──────────────────────────────────────────┐
  loader.py                                           │
  survival_formatter.py    (duration_months + event) │
  preprocessor.py          (18 engineered features)  │
    │                                                 │
    ▼                                                 │
data/processed/loans.parquet                          │
    │                                                 │
    ├── src/models/kaplan_meier.py  (KM, full data)  │
    ├── src/models/cox_ph.py        (Cox PH, full)   │
    └── src/models/rsf.py           (RSF, 200k sub)  │
                │                                     │
                ▼                                     │
            models/  ← .joblib + model_metadata.json ┘
                │
                ▼
          src/api/main.py  (FastAPI, models loaded at startup)
                │
          ┌─────┴─────┐
          ▼           ▼
       Railway     Vercel
       (API)     (React)
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
│   └── api/            FastAPI schemas, routes, main
├── scripts/train.py    one-shot training entry point
├── app/                React frontend (Vite + Tailwind + Recharts)
├── tests/              28 tests, all passing
├── docker/             Dockerfiles + docker-compose
└── docs/               methodology, model card, design spec, implementation plan
```

---

## Tech stack

**Backend:** Python 3.11 · lifelines · scikit-survival · FastAPI · Pydantic v2 · pandas · pyarrow · joblib

**Frontend:** React 18 · Vite · React Router v6 · React Query · Recharts · Tailwind CSS v3 · DM Sans + DM Mono

**Infra:** Docker · Railway (API) · Vercel (frontend) · GitHub Actions CI

---

## Running tests

```bash
python3 -m pytest tests/ -v
```

28 tests, ~5s. GitHub Actions runs on every push.

---

## License

MIT
