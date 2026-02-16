"""
Transaction Streamer Service.
Simulates real-time transaction feed by cycling through the dataset.
Supports WebSocket and HTTP polling.
Tracks live stats as transactions are processed.
Resets all counters when the full cycle completes.
"""

import asyncio
import random
import numpy as np
import pandas as pd
from typing import Optional


class TransactionStreamer:
    """Streams transactions from the dataset with simulated timing."""

    def __init__(self, df: pd.DataFrame, predictor):
        self.df = df
        self.predictor = predictor
        self.feature_cols = [c for c in df.columns if c != "Class"]
        self.current_index = 0
        self.buffer: list[dict] = []
        self.max_buffer = 100
        self._running = False

        # ── Live stats accumulators ──
        self.total_processed = 0
        self.fraud_flagged = 0
        self.blocked_amount = 0.0
        self.correct_predictions = 0
        self._risk_score_sum = 0.0

        # Build demo pool: ALL rows with fraud boosted ×3 for visibility
        fraud_idx = df.index[df["Class"] == 1].tolist()
        legit_idx = df.index[df["Class"] == 0].tolist()

        # Use all legit + tripled fraud for ~5% visible fraud rate
        demo_indices = legit_idx + fraud_idx * 3
        import random as _rnd
        _rnd.seed(42)
        _rnd.shuffle(demo_indices)
        self.demo_indices = demo_indices
        print(f"[*] Streamer initialized with {len(self.demo_indices)} transaction indices "
              f"({len(fraud_idx)*3} fraud boosted)")

    def _reset_stats(self):
        """Reset all live counters for a new cycle."""
        self.total_processed = 0
        self.fraud_flagged = 0
        self.blocked_amount = 0.0
        self.correct_predictions = 0
        self._risk_score_sum = 0.0
        self.buffer.clear()
        print("[*] Streamer cycle complete — stats reset to 0")

    def get_next_transaction(self) -> dict:
        """Get the next transaction with prediction."""
        # Reset everything when the full cycle completes
        if self.current_index >= len(self.demo_indices):
            self.current_index = 0
            self._reset_stats()

        df_idx = self.demo_indices[self.current_index]
        row = self.df.iloc[df_idx]
        features = row[self.feature_cols].values.astype(np.float64)
        prediction = self.predictor.predict(features)

        tx = {
            "id": int(self.current_index),
            "df_idx": int(df_idx),
            "time": float(row.get("Time", 0)),
            "amount": float(row.get("Amount", 0)),
            "is_fraud": int(row["Class"]),
            "risk_level": prediction["risk_level"],
            "combined_confidence": prediction["combined_confidence"],
            "recommendation": prediction["recommendation"],
            "if_label": prediction["if_label"],
            "ae_label": prediction["ae_label"],
        }

        self.current_index += 1

        # ── Accumulate live stats ──
        self.total_processed += 1
        self._risk_score_sum += prediction["combined_confidence"]

        is_flagged = prediction["risk_level"] in ("HIGH", "CRITICAL")
        if is_flagged:
            self.fraud_flagged += 1
        if prediction["recommendation"] == "BLOCK":
            self.blocked_amount += abs(float(row.get("Amount", 0)))

        # Check prediction correctness
        predicted_fraud = 1 if is_flagged else 0
        actual = int(row["Class"])
        if predicted_fraud == actual:
            self.correct_predictions += 1

        # Add to buffer for polling clients
        self.buffer.append(tx)
        if len(self.buffer) > self.max_buffer:
            self.buffer = self.buffer[-self.max_buffer:]

        return tx

    def get_live_stats(self) -> dict:
        """Return accumulated live stats from processed transactions."""
        total = self.total_processed
        if total == 0:
            return {
                "total_transactions": 0,
                "flagged_transactions": 0,
                "fraud_rate": 0.0,
                "model_accuracy": 0.0,
                "blocked_amount": 0.0,
                "avg_risk_score": 0.0,
            }
        return {
            "total_transactions": total,
            "flagged_transactions": self.fraud_flagged,
            "fraud_rate": round(self.fraud_flagged / total, 6),
            "model_accuracy": round(self.correct_predictions / total, 4),
            "blocked_amount": round(self.blocked_amount, 2),
            "avg_risk_score": round(self._risk_score_sum / total, 4),
        }

    def get_buffered(self, since_id: int = 0, limit: int = 20) -> list[dict]:
        """Get buffered transactions for HTTP polling fallback."""
        filtered = [t for t in self.buffer if t["id"] > since_id]
        return filtered[-limit:]

    async def stream_generator(self):
        """Async generator for WebSocket streaming."""
        while True:
            tx = self.get_next_transaction()
            yield tx
            # Random delay between 0.5s and 2s for realistic feel
            await asyncio.sleep(random.uniform(0.5, 2.0))
