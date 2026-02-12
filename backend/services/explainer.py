"""
SHAP Explainability Service.
Computes SHAP values for individual transactions using TreeExplainer on Isolation Forest.
"""

import os
import pickle
import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

# Feature names for the credit card dataset
FEATURE_NAMES = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]


class ShapExplainer:
    """Computes SHAP values for transaction explainability."""

    def __init__(self):
        self.explainer = None
        self._load()

    def _load(self):
        """Load the Isolation Forest and pre-build the TreeExplainer."""
        import shap

        if_path = os.path.join(MODEL_DIR, "isolation_forest.pkl")
        with open(if_path, "rb") as f:
            model = pickle.load(f)

        self.explainer = shap.TreeExplainer(model)
        print("[*] SHAP TreeExplainer loaded")

    def explain(self, features: np.ndarray) -> dict:
        """
        Compute SHAP values for a single transaction.

        Args:
            features: numpy array of shape (n_features,)

        Returns:
            dict with base_value, prediction, and per-feature SHAP values
        """
        features_2d = features.reshape(1, -1)
        shap_values = self.explainer.shap_values(features_2d)

        # shap_values is array of shape (1, n_features)
        sv = shap_values[0]
        base_value = float(self.explainer.expected_value)

        # Build per-feature breakdown
        shap_list = []
        for i, name in enumerate(FEATURE_NAMES):
            if i < len(sv):
                shap_list.append({
                    "feature": name,
                    "value": round(float(features[i]), 4),
                    "shap_value": round(float(sv[i]), 6),
                })

        # Sort by absolute SHAP value (most influential first)
        shap_list.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        return {
            "base_value": round(base_value, 6),
            "prediction": round(base_value + sum(s["shap_value"] for s in shap_list), 6),
            "shap_values": shap_list,
        }
