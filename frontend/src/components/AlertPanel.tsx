"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { streamExplanation } from "@/lib/api";
import { RISK_BG_CLASSES } from "@/lib/constants";

interface AlertPanelProps {
    transactionId: number | null;
    riskLevel: string | null;
    ifScore: number | null;
    aeScore: number | null;
    recommendation: string | null;
    confidence: number | null;
}

export default function AlertPanel({
    transactionId,
    riskLevel,
    ifScore,
    aeScore,
    recommendation,
    confidence,
}: AlertPanelProps) {
    const [explanation, setExplanation] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);

    useEffect(() => {
        if (transactionId === null) return;

        setExplanation("");
        setIsStreaming(true);

        let cancelled = false;

        (async () => {
            try {
                for await (const chunk of streamExplanation(transactionId)) {
                    if (cancelled) break;
                    setExplanation((prev) => prev + chunk);
                }
            } catch (e) {
                if (!cancelled) {
                    setExplanation("Unable to generate explanation. The AI service may be unavailable.");
                }
            } finally {
                if (!cancelled) setIsStreaming(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [transactionId]);

    if (transactionId === null) {
        return (
            <div className="glass-card p-4 h-full flex items-center justify-center">
                <p className="text-[var(--color-text-muted)] text-sm text-center">
                    Select a transaction from the feed<br />to see AI-powered analysis
                </p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-4 h-full flex flex-col"
        >
            {/* Header with Risk Badge */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
                        AI Fraud Analysis
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Transaction #{transactionId}</p>
                </div>
                {riskLevel && (
                    <span
                        className={`text-sm px-3 py-1 rounded-full font-bold ${RISK_BG_CLASSES[riskLevel] || "risk-low"
                            }`}
                    >
                        {riskLevel}
                    </span>
                )}
            </div>

            {/* Dual Model Scores */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Isolation Forest</p>
                    <p className="text-lg font-bold text-[var(--color-text-primary)] stat-number">
                        {ifScore !== null ? `${(ifScore * 100).toFixed(1)}%` : "—"}
                    </p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Autoencoder Error</p>
                    <p className="text-lg font-bold text-[var(--color-text-primary)] stat-number">
                        {aeScore !== null ? aeScore.toFixed(4) : "—"}
                    </p>
                </div>
            </div>

            {/* Combined Confidence Bar */}
            {confidence !== null && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--color-text-muted)]">Combined Confidence</span>
                        <span className="text-[var(--color-text-primary)] font-bold">
                            {(confidence * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${confidence * 100}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full rounded-full ${confidence >= 0.6
                                    ? "gradient-danger"
                                    : confidence >= 0.35
                                        ? "gradient-warning"
                                        : "gradient-safe"
                                }`}
                        />
                    </div>
                </div>
            )}

            {/* LLM Explanation */}
            <div className="flex-1 bg-white/3 rounded-xl p-3 overflow-y-auto">
                <p className="text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                    🤖 AI Explanation
                </p>
                <p className={`text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line ${isStreaming ? "typing-caret" : ""
                    }`}>
                    {explanation || (isStreaming ? "" : "Loading analysis...")}
                </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 mt-4">
                <button className="px-3 py-2 rounded-xl text-xs font-bold text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
                    🚫 Block
                </button>
                <button className="px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all">
                    👁️ Review
                </button>
                <button className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                    ✅ Allow
                </button>
            </div>
        </motion.div>
    );
}
