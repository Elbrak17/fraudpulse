# FraudPulse — AI-Powered Transaction Fraud Detection Dashboard

> **DevDash 2026 Hackathon Submission**  
> Real-time fraud detection powered by dual ML models, Explainable AI (SHAP), and LLM-generated insights.

![Status](https://img.shields.io/badge/status-working%20prototype-brightgreen)
![Stack](https://img.shields.io/badge/stack-Next.js%2015%20%2B%20FastAPI%20%2B%20PyTorch-blue)
![AI](https://img.shields.io/badge/AI-Gemini%203.0%20Flash-purple)

---

## 🚀 Problem Statement

Financial fraud costs the global economy **$32+ billion annually**. Traditional rule-based systems miss sophisticated attacks and produce excessive false positives. Fraud analysts are overwhelmed by alert volumes and lack explainability into why transactions are flagged.

## 💡 Solution

**FraudPulse** is an intelligent fraud detection dashboard that:

1. **Dual ML Scoring** — Runs every transaction through both an **Isolation Forest** and a **PyTorch Autoencoder**, combining scores for higher accuracy
2. **Explainable AI** — Provides **SHAP waterfall charts** showing exactly which features contributed to each fraud prediction
3. **LLM-Powered Insights** — Uses **Gemini 3.0 Flash** to generate natural language explanations of why a transaction is suspicious
4. **Real-Time Monitoring** — Live transaction feed via **WebSocket** with automatic **HTTP polling fallback**

## 🏗️ Architecture

```
┌─────────────────────┐     WebSocket / Polling      ┌──────────────────────┐
│                     │◄────────────────────────────►│                      │
│   Next.js Frontend  │     REST API + SSE           │   FastAPI Backend    │
│   (Dashboard UI)    │◄────────────────────────────►│                      │
│                     │                              │  ┌────────────────┐  │
│  • Stats Cards      │                              │  │ Isolation      │  │
│  • Transaction Feed │                              │  │ Forest         │  │
│  • SHAP Waterfall   │                              │  ├────────────────┤  │
│  • LLM Alert Panel  │                              │  │ PyTorch        │  │
│  • Risk Trend       │                              │  │ Autoencoder    │  │
│  • Risk Distribution│                              │  ├────────────────┤  │
│  •                     │                              │  │ SHAP Explainer │  │
└─────────────────────┘                              │  ├────────────────┤  │
                                                     │  │ Gemini 3.0     │  │
                                                     │  │ Flash LLM      │  │
                                                     │  └────────────────┘  │
                                                     └──────────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS, Recharts, Framer Motion |
| **Backend** | FastAPI, Python 3.12, Uvicorn |
| **ML Models** | scikit-learn (Isolation Forest), PyTorch (Autoencoder) |
| **Explainability** | SHAP (TreeExplainer) |
| **LLM** | Google Gemini 3.0 Flash Preview (streaming SSE) |
| **Data** | Kaggle Credit Card Fraud Dataset (284,807 real bank transactions) |
| **Real-Time** | WebSocket + HTTP Polling fallback |

## 📦 Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- (Optional) Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Backend Setup

```bash
cd fraudpulse/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Download dataset
# Get creditcard.csv from https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
# Place it in fraudpulse/backend/data/creditcard.csv
# (For deployment, the dataset is downloaded automatically via DATASET_URL env var)

# Set environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Train ML models
python models/train.py

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd fraudpulse/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 3. Open Dashboard

Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Key Features

- **📊 Real-Time Dashboard** — Live transaction feed with animated risk indicators
- **🤖 Dual AI Models** — Isolation Forest + Autoencoder for ensemble fraud detection
- **🔍 SHAP Explainability** — Per-feature impact analysis for every prediction
- **💬 LLM Explanations** — Gemini 3.0 generates human-readable fraud analysis
- **🌐 Resilient Streaming** — WebSocket with automatic HTTP polling fallback
- **🎨 Premium UI** — Dark glassmorphism theme with micro-animations

## 👤 Team

- **Developer** — Solo project

## 📄 License

Built for DevDash 2026. All rights reserved.
