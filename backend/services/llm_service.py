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


SYSTEM_PROMPT = """You are FraudPulse AI, an expert fraud detection analyst. 
You analyze transaction data and provide clear, concise explanations of why a transaction was flagged.

Your response must follow this exact structure:
1. **Risk Assessment** — One sentence summary of the risk level
2. **Key Indicators** — 2-3 bullet points highlighting the most suspicious features
3. **Recommendation** — Clear action: BLOCK, REVIEW, or ALLOW with justification

Keep your response under 150 words. Use professional, actionable language.
Do NOT use markdown headers. Use plain text with bullet points (•)."""


def build_prompt(transaction_data: dict, shap_top5: list[dict]) -> str:
    """Build a prompt from transaction data and top SHAP contributors."""
    shap_desc = "\n".join(
        f"  • {s['feature']}: value={s['value']}, impact={s['shap_value']:+.4f}"
        for s in shap_top5
    )
    return f"""Analyze this transaction for fraud:

Transaction ID: {transaction_data.get('id', 'N/A')}
Amount: ${transaction_data.get('amount', 0):.2f}
Isolation Forest Score: {transaction_data.get('if_score', 0):.2%} fraud probability
Autoencoder Reconstruction Error: {transaction_data.get('ae_reconstruction_error', 0):.6f}
Combined Risk: {transaction_data.get('combined_confidence', 0):.2%}
Risk Level: {transaction_data.get('risk_level', 'UNKNOWN')}

Top contributing features (SHAP analysis):
{shap_desc}

Provide your fraud analysis:"""


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
                temperature=0.3,
                max_output_tokens=300,
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

    if risk in ("CRITICAL", "HIGH"):
        return (
            f"Risk Assessment: This transaction of ${amount:.2f} has been flagged with "
            f"{confidence:.1%} confidence as potentially fraudulent.\n\n"
            f"• Anomaly detected by both Isolation Forest and Autoencoder models\n"
            f"• Transaction amount and pattern deviate significantly from account baseline\n"
            f"• Multiple feature dimensions indicate suspicious activity\n\n"
            f"Recommendation: {transaction_data.get('recommendation', 'BLOCK')} — "
            f"Immediate review required. Hold funds pending investigation."
        )
    else:
        return (
            f"Risk Assessment: This transaction of ${amount:.2f} appears within normal "
            f"parameters with {confidence:.1%} risk score.\n\n"
            f"• Transaction patterns consistent with account history\n"
            f"• No significant anomalies detected by either model\n\n"
            f"Recommendation: ALLOW — Transaction may proceed."
        )
