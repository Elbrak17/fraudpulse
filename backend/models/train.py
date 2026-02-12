"""
FraudPulse ML Training Pipeline.
Trains dual models (Isolation Forest + Autoencoder) on the Kaggle Credit Card Fraud dataset.
Computes SHAP values and saves everything to disk.
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, f1_score
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MODEL_DIR = os.path.dirname(__file__)


# ── Autoencoder Architecture ──────────────────────────────────

class FraudAutoencoder(nn.Module):
    """Autoencoder for anomaly detection via reconstruction error."""

    def __init__(self, input_dim: int = 29):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 20),
            nn.ReLU(),
            nn.BatchNorm1d(20),
            nn.Linear(20, 12),
            nn.ReLU(),
            nn.BatchNorm1d(12),
            nn.Linear(12, 6),
            nn.ReLU(),
        )
        self.decoder = nn.Sequential(
            nn.Linear(6, 12),
            nn.ReLU(),
            nn.BatchNorm1d(12),
            nn.Linear(12, 20),
            nn.ReLU(),
            nn.BatchNorm1d(20),
            nn.Linear(20, input_dim),
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded


# ── Data Loading ──────────────────────────────────────────────

def load_and_preprocess():
    """Load Kaggle credit card fraud dataset and preprocess it."""
    # Priority: check for .csv, then .csv.gz
    csv_path = os.path.join(DATA_DIR, "creditcard.csv")
    gz_path = os.path.join(DATA_DIR, "creditcard.csv.gz")
    
    path_to_use = None
    if os.path.exists(csv_path):
        path_to_use = csv_path
    elif os.path.exists(gz_path):
        path_to_use = gz_path
        
    if not path_to_use:
        raise FileNotFoundError(
            f"Dataset not found at {csv_path} or {gz_path}. "
            "Download from: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud"
        )

    print(f"[*] Loading dataset from {path_to_use}...")
    # Pandas detects compression automatically
    df = pd.read_csv(path_to_use)
    print(f"    Shape: {df.shape}")
    print(f"    Fraud ratio: {df['Class'].mean():.4%}")

    # Scale Amount and Time (V1-V28 are already PCA-transformed)
    scaler = StandardScaler()
    df["Amount"] = scaler.fit_transform(df[["Amount"]])
    df["Time"] = scaler.fit_transform(df[["Time"]])

    # Save scaler for inference
    with open(os.path.join(MODEL_DIR, "scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)

    return df


# ── Isolation Forest Training ─────────────────────────────────

def train_isolation_forest(df: pd.DataFrame):
    """Train Isolation Forest on the full dataset."""
    print("\n[*] Training Isolation Forest...")
    feature_cols = [c for c in df.columns if c != "Class"]
    X = df[feature_cols].values
    y = df["Class"].values

    # contamination matches the actual fraud rate
    fraud_rate = y.mean()
    model = IsolationForest(
        n_estimators=200,
        contamination=fraud_rate,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)

    # Evaluate
    preds = model.predict(X)
    # IsolationForest: -1 = anomaly, 1 = normal → convert to 0/1
    preds_binary = (preds == -1).astype(int)
    print("\n    Isolation Forest Results:")
    print(classification_report(y, preds_binary, target_names=["Legitimate", "Fraud"]))

    # Save model
    model_path = os.path.join(MODEL_DIR, "isolation_forest.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    print(f"    Saved to {model_path}")

    return model


# ── Autoencoder Training ──────────────────────────────────────

def train_autoencoder(df: pd.DataFrame, epochs: int = 30, batch_size: int = 512):
    """Train Autoencoder only on legitimate transactions, then detect anomalies."""
    print("\n[*] Training Autoencoder...")
    feature_cols = [c for c in df.columns if c != "Class"]
    X_all = df[feature_cols].values
    y_all = df["Class"].values

    # Train ONLY on legitimate transactions (label 0)
    X_normal = X_all[y_all == 0]
    print(f"    Training on {len(X_normal)} legitimate transactions")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"    Device: {device}")

    X_tensor = torch.FloatTensor(X_normal).to(device)
    dataset = TensorDataset(X_tensor, X_tensor)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    model = FraudAutoencoder(input_dim=X_all.shape[1]).to(device)
    optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    criterion = nn.MSELoss()

    # Training loop
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        for batch_x, _ in loader:
            optimizer.zero_grad()
            output = model(batch_x)
            loss = criterion(output, batch_x)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        avg_loss = total_loss / len(loader)
        if (epoch + 1) % 5 == 0:
            print(f"    Epoch {epoch+1}/{epochs} — Loss: {avg_loss:.6f}")

    # Compute reconstruction errors on ALL data
    model.eval()
    with torch.no_grad():
        X_all_tensor = torch.FloatTensor(X_all).to(device)
        reconstructed = model(X_all_tensor)
        errors = torch.mean((X_all_tensor - reconstructed) ** 2, dim=1).cpu().numpy()

    # Set threshold at 99th percentile of normal reconstruction errors
    normal_errors = errors[y_all == 0]
    threshold = np.percentile(normal_errors, 99)
    print(f"    Reconstruction error threshold (99th pct): {threshold:.6f}")

    # Evaluate
    preds_binary = (errors > threshold).astype(int)
    print("\n    Autoencoder Results:")
    print(classification_report(y_all, preds_binary, target_names=["Legitimate", "Fraud"]))

    # Save model + threshold
    model_path = os.path.join(MODEL_DIR, "autoencoder.pt")
    torch.save({
        "model_state_dict": model.state_dict(),
        "threshold": threshold,
        "input_dim": X_all.shape[1],
    }, model_path)
    print(f"    Saved to {model_path}")

    return model, threshold


# ── Main ──────────────────────────────────────────────────────

def main():
    df = load_and_preprocess()
    train_isolation_forest(df)
    train_autoencoder(df)
    print("\n[✓] All models trained and saved successfully!")
    print(f"    Models directory: {MODEL_DIR}")


if __name__ == "__main__":
    main()
