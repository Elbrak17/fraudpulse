"""
Dual-model prediction service.
Runs both Isolation Forest and Autoencoder on a transaction,
combines scores into a unified risk assessment.
"""

import os
import pickle
import numpy as np
import torch
from models.train import FraudAutoencoder

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")


class FraudPredictor:
    """Loads both models and provides dual-model predictions."""

    def __init__(self):
        self._load_models()

    def _load_models(self):
        # Load Isolation Forest
        if_path = os.path.join(MODEL_DIR, "isolation_forest.pkl")
        with open(if_path, "rb") as f:
            self.isolation_forest = pickle.load(f)

        # Load Autoencoder
        ae_path = os.path.join(MODEL_DIR, "autoencoder.pt")
        checkpoint = torch.load(ae_path, map_location="cpu", weights_only=False)
        self.ae_threshold = checkpoint["threshold"]
        input_dim = checkpoint["input_dim"]
        self.autoencoder = FraudAutoencoder(input_dim=input_dim)
        self.autoencoder.load_state_dict(checkpoint["model_state_dict"])
        self.autoencoder.eval()

        print("[*] Both models loaded successfully")

    def predict(self, features: np.ndarray) -> dict:
        """
        Run dual-model prediction on a single transaction.

        Args:
            features: numpy array of shape (n_features,) — all features (Time, V1-V28, Amount)

        Returns:
            dict with IF score, AE score, combined confidence, risk level, recommendation
        """
        features_2d = features.reshape(1, -1)

        # ── Isolation Forest ──
        if_raw_score = self.isolation_forest.decision_function(features_2d)[0]
        if_pred = self.isolation_forest.predict(features_2d)[0]
        # Convert: more negative = more anomalous → normalize to 0-1 (1 = likely fraud)
        if_score = max(0.0, min(1.0, -if_raw_score * 2 + 0.5))
        if_label = "fraud" if if_pred == -1 else "legitimate"

        # ── Autoencoder ──
        with torch.no_grad():
            x_tensor = torch.FloatTensor(features_2d)
            reconstructed = self.autoencoder(x_tensor)
            ae_error = torch.mean((x_tensor - reconstructed) ** 2).item()

        # Normalize AE score: error / threshold ratio, capped at 1
        ae_score = min(1.0, ae_error / (self.ae_threshold * 2))
        ae_label = "fraud" if ae_error > self.ae_threshold else "legitimate"

        # ── Combined Score ──
        # Weighted: 40% IF, 60% AE (autoencoder is usually more precise for anomaly detection)
        combined = 0.4 * if_score + 0.6 * ae_score
        combined = round(combined, 4)

        # ── Risk Level ──
        if combined >= 0.85:
            risk_level = "CRITICAL"
            recommendation = "BLOCK"
        elif combined >= 0.60:
            risk_level = "HIGH"
            recommendation = "BLOCK"
        elif combined >= 0.35:
            risk_level = "MEDIUM"
            recommendation = "REVIEW"
        else:
            risk_level = "LOW"
            recommendation = "ALLOW"

        return {
            "if_score": round(if_score, 4),
            "if_label": if_label,
            "ae_reconstruction_error": round(ae_error, 6),
            "ae_label": ae_label,
            "combined_confidence": combined,
            "risk_level": risk_level,
            "recommendation": recommendation,
        }
