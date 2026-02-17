"""Pydantic schemas for FraudPulse API."""

from pydantic import BaseModel
from typing import Optional
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TransactionBase(BaseModel):
    id: int
    time: float
    amount: float
    is_fraud: int  # ground truth label


class TransactionOut(TransactionBase):
    features: dict  # V1-V28 feature values


class PredictionResult(BaseModel):
    transaction_id: int
    amount: float
    # Isolation Forest
    if_score: float
    if_label: str  # "fraud" or "legitimate"
    # Autoencoder
    ae_reconstruction_error: float
    ae_label: str
    # Combined
    combined_confidence: float
    risk_level: RiskLevel
    recommendation: str  # "BLOCK", "REVIEW", "ALLOW"


class ShapValue(BaseModel):
    feature: str
    value: float
    shap_value: float


class ShapResult(BaseModel):
    transaction_id: int
    base_value: float
    prediction: float
    shap_values: list[ShapValue]


class StatsOut(BaseModel):
    total_transactions: int
    flagged_transactions: int
    fraud_rate: float
    model_accuracy: float
    blocked_amount: float
    avg_risk_score: float
    risk_distribution: dict[str, int] = {}


class StreamTransaction(BaseModel):
    """A transaction sent via WebSocket or polling."""
    id: int
    df_idx: int  # Real dataset row index for /api/explain and /api/shap
    time: float
    amount: float
    risk_level: RiskLevel
    combined_confidence: float
    is_fraud: int
    recommendation: str
    if_label: str  # "fraud" or "legitimate"
    ae_label: str  # "fraud" or "legitimate"
