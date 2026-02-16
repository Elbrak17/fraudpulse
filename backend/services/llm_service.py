"""
LLM Service — Gemini 3.0 Flash Preview for natural language fraud alert explanations.
Uses Server-Sent Events (SSE) for streaming output.
"""

import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def get_client():
    """Get Gemini client."""
    return genai.Client(api_key=GEMINI_API_KEY)


SYSTEM_PROMPT = """You are FraudPulse AI, an expert fraud detection analyst working inside a real-time fraud monitoring dashboard.
You analyze credit card transactions using signals from two ML models (Isolation Forest anomaly detector and an Autoencoder reconstruction error model) combined with SHAP feature attribution.

Your analysis MUST follow this exact structure — write ALL sections, do NOT stop early:

1. Risk Assessment
One-two sentences summarizing the overall risk verdict and why.

2. Key Indicators
Analyze the top SHAP features provided. For each one, explain in plain language what the feature value means and why it contributes to the fraud/legit verdict. Reference the actual feature names (V1, V14, etc.) and their SHAP impact values. Explain whether each feature pushes toward fraud or legitimacy.

3. Model Agreement
Compare the two model outputs (Isolation Forest score and Autoencoder reconstruction error). Do they agree? If one flags anomaly and the other doesn't, explain what that means.

4. Recommendation
State BLOCK, REVIEW, or ALLOW with a clear justification based on the combined evidence.

Important rules:
- Be specific — reference actual numbers from the data (amounts, scores, SHAP values).
- Use bullet points (•) for lists.
- Do NOT use markdown headers or bold text.
- Write 200-300 words total — be thorough, not vague.
- ALWAYS complete all 4 sections. Never stop mid-sentence."""


def build_prompt(transaction_data: dict, shap_top5: list[dict]) -> str:
    """Build a prompt from transaction data and top SHAP contributors."""
    shap_desc = "\n".join(
        f"  • {s['feature']}: value={s['value']:.4f}, SHAP impact={s['shap_value']:+.6f} ({'pushes toward FRAUD' if s['shap_value'] < 0 else 'pushes toward LEGIT'})"
        for s in shap_top5
    )

    if_score = transaction_data.get("if_score", 0)
    ae_error = transaction_data.get("ae_reconstruction_error", 0)
    if_label = transaction_data.get("if_label", "unknown")
    ae_label = transaction_data.get("ae_label", "unknown")

    return f"""Analyze this credit card transaction for fraud. Provide a COMPLETE analysis with all 4 sections.

Transaction ID: {transaction_data.get('id', 'N/A')}
Amount: ${transaction_data.get('amount', 0):.2f}

Model Results:
  • Isolation Forest anomaly score: {if_score:.2%} → verdict: {if_label.upper()}
  • Autoencoder reconstruction error: {ae_error:.6f} → verdict: {ae_label.upper()}
  • Combined confidence: {transaction_data.get('combined_confidence', 0):.2%}
  • Final risk level: {transaction_data.get('risk_level', 'UNKNOWN')}
  • Recommendation: {transaction_data.get('recommendation', 'N/A')}

Top 5 SHAP feature contributions (negative = pushes toward fraud, positive = pushes toward legit):
{shap_desc}

Provide your complete fraud analysis now — include all 4 sections (Risk Assessment, Key Indicators, Model Agreement, Recommendation):"""


async def stream_explanation(transaction_data: dict, shap_top5: list[dict]):
    """
    Generator that yields chunks of LLM explanation text.
    Used for SSE streaming to the frontend.
    """
    if not GEMINI_API_KEY:
        # Fallback for when no API key is set
        fallback = _generate_fallback(transaction_data)
        for word in fallback.split(" "):
            yield word + " "
        return

    client = get_client()
    prompt = build_prompt(transaction_data, shap_top5)

    try:
        response = client.models.generate_content_stream(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.4,
                max_output_tokens=1500,
            ),
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"[Analysis unavailable: {str(e)}] "
        fallback = _generate_fallback(transaction_data)
        yield fallback


def _generate_fallback(transaction_data: dict) -> str:
    """Generate a rule-based fallback explanation when LLM is unavailable."""
    risk = transaction_data.get("risk_level", "UNKNOWN")
    amount = transaction_data.get("amount", 0)
    confidence = transaction_data.get("combined_confidence", 0)
    if_score = transaction_data.get("if_score", 0)
    ae_error = transaction_data.get("ae_reconstruction_error", 0)
    if_label = transaction_data.get("if_label", "unknown")
    ae_label = transaction_data.get("ae_label", "unknown")

    if risk in ("CRITICAL", "HIGH"):
        return (
            f"1. Risk Assessment\n"
            f"This transaction of ${amount:.2f} has been flagged with "
            f"{confidence:.1%} combined confidence as potentially fraudulent.\n\n"
            f"2. Key Indicators\n"
            f"• Isolation Forest anomaly score: {if_score:.1%} ({if_label})\n"
            f"• Autoencoder reconstruction error: {ae_error:.4f} ({ae_label})\n"
            f"• Transaction amount and feature patterns deviate significantly from baseline\n\n"
            f"3. Model Agreement\n"
            f"• IF verdict: {if_label.upper()} | AE verdict: {ae_label.upper()}\n"
            f"• {'Both models agree on anomaly detection' if if_label == ae_label else 'Models disagree — one flags anomaly while the other does not'}\n\n"
            f"4. Recommendation\n"
            f"{transaction_data.get('recommendation', 'BLOCK')} — "
            f"Immediate review required. Hold funds pending investigation."
        )
    else:
        return (
            f"1. Risk Assessment\n"
            f"This transaction of ${amount:.2f} appears within normal "
            f"parameters with {confidence:.1%} risk score.\n\n"
            f"2. Key Indicators\n"
            f"• Isolation Forest anomaly score: {if_score:.1%} ({if_label})\n"
            f"• Autoencoder reconstruction error: {ae_error:.4f} ({ae_label})\n"
            f"• Transaction patterns consistent with account history\n\n"
            f"3. Model Agreement\n"
            f"• IF verdict: {if_label.upper()} | AE verdict: {ae_label.upper()}\n"
            f"• Both models indicate normal activity\n\n"
            f"4. Recommendation\n"
            f"ALLOW — Transaction may proceed."
        )
