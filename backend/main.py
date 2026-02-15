"""
FraudPulse Backend — FastAPI Application
AI-Powered Transaction Fraud Detection Dashboard
"""

import json
import asyncio
import numpy as np
import pandas as pd
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from schemas import (
    TransactionOut, PredictionResult, ShapResult, ShapValue,
    StatsOut, StreamTransaction, RiskLevel,
)
from services.predictor import FraudPredictor
from services.explainer import ShapExplainer
from services.streamer import TransactionStreamer
from services.llm_service import stream_explanation

# ── Global state ──
predictor: FraudPredictor = None
explainer: ShapExplainer = None
streamer: TransactionStreamer = None
df: pd.DataFrame = None
feature_cols: list[str] = []
cached_stats: dict = None

DATA_PATH = Path(__file__).parent / "data" / "creditcard_sample.csv"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models and data on startup."""
    global predictor, explainer, streamer, df, feature_cols

    print("[*] FraudPulse starting up...")

    # Load dataset
    if not DATA_PATH.exists():
        print(f"[!] Dataset not found at {DATA_PATH}")
    else:
        try:
            from sklearn.preprocessing import StandardScaler

            df = pd.read_csv(DATA_PATH)

            scaler = StandardScaler()
            df["Amount"] = scaler.fit_transform(df[["Amount"]])
            df["Time"] = scaler.fit_transform(df[["Time"]])
            feature_cols = [c for c in df.columns if c != "Class"]
            print(f"[*] Dataset loaded: {len(df)} transactions")
        except Exception as e:
            print(f"[!] Failed to load dataset: {e}")
            df = None

    # Load models
    try:
        predictor = FraudPredictor()
        explainer = ShapExplainer()
        if df is not None:
            streamer = TransactionStreamer(df, predictor)
        print("[✓] All services initialized")
    except Exception as e:
        print(f"[!] Failed to load models: {e}")
        print("    Run: python models/train.py first")

    gc.collect()
    yield

    print("[*] FraudPulse shutting down...")


app = FastAPI(
    title="FraudPulse API",
    description="AI-Powered Transaction Fraud Detection Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ──────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "models_loaded": predictor is not None,
        "data_loaded": df is not None,
    }


# ── Statistics ────────────────────────────────────────────────

@app.get("/api/stats", response_model=StatsOut)
async def get_stats():
    """Get aggregate dashboard statistics (cached after first call)."""
    global cached_stats

    if df is None:
        raise HTTPException(503, "Dataset not loaded")

    # Return cached stats to avoid re-computing 1000 predictions each time
    if cached_stats is not None:
        return cached_stats

    total = len(df)
    fraud_count = int(df["Class"].sum())
    fraud_rate = fraud_count / total

    # Use a smaller sample to reduce CPU/memory pressure
    sample_size = min(200, total)
    sample = df.sample(n=sample_size, random_state=42)
    correct = 0
    total_flagged_amount = 0.0
    risk_scores = []

    for _, row in sample.iterrows():
        features = row[feature_cols].values.astype(np.float64)
        pred = predictor.predict(features)
        predicted_fraud = 1 if pred["risk_level"] in ("HIGH", "CRITICAL") else 0
        actual = int(row["Class"])
        if predicted_fraud == actual:
            correct += 1
        if predicted_fraud == 1:
            total_flagged_amount += abs(float(row["Amount"]))
        risk_scores.append(pred["combined_confidence"])

    cached_stats = StatsOut(
        total_transactions=total,
        flagged_transactions=fraud_count,
        fraud_rate=round(fraud_rate, 6),
        model_accuracy=round(correct / sample_size, 4),
        blocked_amount=round(total_flagged_amount * (total / sample_size), 2),
        avg_risk_score=round(float(np.mean(risk_scores)), 4),
    )
    return cached_stats


# ── Transactions ──────────────────────────────────────────────

@app.get("/api/transactions")
async def get_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get paginated transaction list with predictions."""
    if df is None:
        raise HTTPException(503, "Dataset not loaded")

    start = (page - 1) * limit
    end = start + limit
    page_df = df.iloc[start:end]

    results = []
    for idx, row in page_df.iterrows():
        features = row[feature_cols].values.astype(np.float64)
        pred = predictor.predict(features)
        results.append({
            "id": int(idx),
            "time": float(row["Time"]),
            "amount": float(row["Amount"]),
            "is_fraud": int(row["Class"]),
            **pred,
        })

    return {
        "transactions": results,
        "page": page,
        "limit": limit,
        "total": len(df),
    }


# ── Prediction ────────────────────────────────────────────────

@app.get("/api/predict/{transaction_id}", response_model=PredictionResult)
async def predict_transaction(transaction_id: int):
    """Get dual-model prediction for a specific transaction."""
    if df is None or predictor is None:
        raise HTTPException(503, "Service not ready")
    if transaction_id >= len(df) or transaction_id < 0:
        raise HTTPException(404, "Transaction not found")

    row = df.iloc[transaction_id]
    features = row[feature_cols].values.astype(np.float64)
    pred = predictor.predict(features)

    return PredictionResult(
        transaction_id=transaction_id,
        amount=float(row["Amount"]),
        **pred,
    )


# ── SHAP Explainability ──────────────────────────────────────

@app.get("/api/shap/{transaction_id}", response_model=ShapResult)
async def get_shap(transaction_id: int):
    """Get SHAP values for a specific transaction."""
    if df is None or explainer is None:
        raise HTTPException(503, "Service not ready")
    if transaction_id >= len(df) or transaction_id < 0:
        raise HTTPException(404, "Transaction not found")

    row = df.iloc[transaction_id]
    features = row[feature_cols].values.astype(np.float64)
    result = explainer.explain(features)

    return ShapResult(
        transaction_id=transaction_id,
        base_value=result["base_value"],
        prediction=result["prediction"],
        shap_values=[ShapValue(**sv) for sv in result["shap_values"]],
    )


# ── LLM Explanation (SSE Streaming) ──────────────────────────

@app.get("/api/explain/{transaction_id}")
async def explain_transaction(transaction_id: int):
    """Stream LLM-generated fraud explanation via Server-Sent Events."""
    if df is None or predictor is None:
        raise HTTPException(503, "Service not ready")
    if transaction_id >= len(df) or transaction_id < 0:
        raise HTTPException(404, "Transaction not found")

    row = df.iloc[transaction_id]
    features = row[feature_cols].values.astype(np.float64)
    pred = predictor.predict(features)
    shap_data = explainer.explain(features)

    tx_data = {
        "id": transaction_id,
        "amount": float(row["Amount"]),
        **pred,
    }
    top5_shap = shap_data["shap_values"][:5]

    async def event_generator():
        async for chunk in stream_explanation(tx_data, top5_shap):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# ── WebSocket Transaction Stream ─────────────────────────────

@app.websocket("/ws/transactions")
async def websocket_transactions(websocket: WebSocket):
    """Real-time transaction feed via WebSocket."""
    if streamer is None:
        await websocket.close(code=1011, reason="Streamer not ready")
        return

    await websocket.accept()
    print("[WS] Client connected")

    try:
        async for tx in streamer.stream_generator():
            await websocket.send_json(tx)
    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Error: {e}")


# ── HTTP Polling Fallback ─────────────────────────────────────

@app.get("/api/poll/transactions")
async def poll_transactions(
    since_id: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
):
    """HTTP polling fallback for when WebSocket is unavailable."""
    if streamer is None:
        raise HTTPException(503, "Streamer not ready")

    # Generate a new transaction on each poll for liveliness
    tx = streamer.get_next_transaction()
    buffered = streamer.get_buffered(since_id=since_id, limit=limit)

    return {
        "transactions": buffered,
        "latest_id": buffered[-1]["id"] if buffered else since_id,
    }
