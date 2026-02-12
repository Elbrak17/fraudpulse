"""
Transaction Streamer Service.
Simulates real-time transaction feed by cycling through the dataset.
Supports WebSocket and HTTP polling.
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

        # Create an index array instead of copying the whole DataFrame
        # Mix: boost fraud rows for demo impact (~5% fraud rate)
        fraud_idx = df.index[df["Class"] == 1].tolist()
        legit_idx = df.index[df["Class"] == 0].tolist()
        # Limit legit to keep memory low
        import random as _rnd
        _rnd.seed(42)
        legit_sample = _rnd.sample(legit_idx, min(5000, len(legit_idx)))
        # Triple the fraud indices for visibility
        demo_indices = legit_sample + fraud_idx * 3
        _rnd.shuffle(demo_indices)
        self.demo_indices = demo_indices
        print(f"[*] Streamer initialized with {len(self.demo_indices)} transaction indices "
              f"({len(fraud_idx)*3} fraud boosted)")

    def get_next_transaction(self) -> dict:
        """Get the next transaction with prediction."""
        if self.current_index >= len(self.demo_indices):
            self.current_index = 0

        df_idx = self.demo_indices[self.current_index]
        row = self.df.iloc[df_idx]
        features = row[self.feature_cols].values.astype(np.float64)
        prediction = self.predictor.predict(features)

        tx = {
            "id": int(self.current_index),
            "time": float(row.get("Time", 0)),
            "amount": float(row.get("Amount", 0)),
            "is_fraud": int(row["Class"]),
            "risk_level": prediction["risk_level"],
            "combined_confidence": prediction["combined_confidence"],
            "recommendation": prediction["recommendation"],
        }

        self.current_index += 1

        # Add to buffer for polling clients
        self.buffer.append(tx)
        if len(self.buffer) > self.max_buffer:
            self.buffer = self.buffer[-self.max_buffer:]

        return tx

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
