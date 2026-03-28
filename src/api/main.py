import json
import os
from contextlib import asynccontextmanager
import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router

MODEL_DIR = os.environ.get("MODEL_DIR", "models")


def load_state(app: FastAPI) -> None:
    app.state.preprocessor = joblib.load(f"{MODEL_DIR}/preprocessor.joblib")
    app.state.km_model = joblib.load(f"{MODEL_DIR}/km_segments.joblib")
    app.state.cox_model = joblib.load(f"{MODEL_DIR}/cox_ph.joblib")
    app.state.rsf_model = joblib.load(f"{MODEL_DIR}/rsf.joblib")
    with open(f"{MODEL_DIR}/model_metadata.json") as f:
        app.state.metadata = json.load(f)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_state(app)
    yield


app = FastAPI(title="LoanSurv API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGIN", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if os.path.exists(f"{MODEL_DIR}/preprocessor.joblib"):
    load_state(app)
