import { API_BASE } from "./constants";

/* Types */
export interface Transaction {
    id: number;
    time: number;
    amount: number;
    is_fraud: number;
    if_score: number;
    if_label: string;
    ae_reconstruction_error: number;
    ae_label: string;
    combined_confidence: number;
    risk_level: string;
    recommendation: string;
}

export interface StreamTransaction {
    id: number;
    df_idx: number;
    time: number;
    amount: number;
    is_fraud: number;
    risk_level: string;
    combined_confidence: number;
    recommendation: string;
    if_label: string;
    ae_label: string;
}

export interface Stats {
    total_transactions: number;
    flagged_transactions: number;
    fraud_rate: number;
    model_accuracy: number;
    blocked_amount: number;
    avg_risk_score: number;
}

export interface ShapValue {
    feature: string;
    value: number;
    shap_value: number;
}

export interface ShapResult {
    transaction_id: number;
    base_value: number;
    prediction: number;
    shap_values: ShapValue[];
}

export interface PredictionResult {
    transaction_id: number;
    amount: number;
    if_score: number;
    if_label: string;
    ae_reconstruction_error: number;
    ae_label: string;
    combined_confidence: number;
    risk_level: string;
    recommendation: string;
}

/* API Functions */

export async function fetchStats(): Promise<Stats> {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
}

export async function fetchTransactions(page = 1, limit = 20): Promise<{
    transactions: Transaction[];
    page: number;
    limit: number;
    total: number;
}> {
    const res = await fetch(`${API_BASE}/api/transactions?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch transactions");
    return res.json();
}

export async function fetchPrediction(id: number): Promise<PredictionResult> {
    const res = await fetch(`${API_BASE}/api/predict/${id}`);
    if (!res.ok) throw new Error("Failed to fetch prediction");
    return res.json();
}

export async function fetchShap(id: number): Promise<ShapResult> {
    const res = await fetch(`${API_BASE}/api/shap/${id}`);
    if (!res.ok) throw new Error("Failed to fetch SHAP values");
    return res.json();
}

export async function* streamExplanation(id: number): AsyncGenerator<string> {
    const res = await fetch(`${API_BASE}/api/explain/${id}`);
    if (!res.ok) throw new Error("Failed to start explanation stream");

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") return;
                try {
                    const parsed = JSON.parse(data);
                    yield parsed.text;
                } catch { /* skip malformed */ }
            }
        }
    }
}

export async function pollTransactions(sinceId: number = 0): Promise<{
    transactions: StreamTransaction[];
    latest_id: number;
}> {
    const res = await fetch(`${API_BASE}/api/poll/transactions?since_id=${sinceId}&limit=10`);
    if (!res.ok) throw new Error("Failed to poll transactions");
    return res.json();
}
