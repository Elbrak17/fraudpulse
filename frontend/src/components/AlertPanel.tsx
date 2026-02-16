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
    amount: number | null;
    time: number | null;
    isFraud: number | null;
    ifLabel: string | null;
    aeLabel: string | null;
}

function ScoreGauge({
    label,
    value,
    sublabel,
    max,
    formatFn,
    color,
}: {
    label: string;
    value: number;
    sublabel?: string | null;
    max: number;
    formatFn: (v: number) => string;
    color: string;
}) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="bg-white/5 rounded-xl p-3 relative overflow-hidden">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-1 uppercase tracking-wider font-medium">
                {label}
            </p>
            <div className="flex items-baseline gap-2">
                <p className="text-lg font-bold text-[var(--color-text-primary)] stat-number">
                    {formatFn(value)}
                </p>
                {sublabel && (
                    <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${sublabel === "ANOMALY"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-emerald-500/15 text-emerald-400"
                            }`}
                    >
                        {sublabel}
                    </span>
                )}
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1.5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bar-glow"
                    style={{
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}40`,
                    }}
                />
            </div>
        </div>
    );
}

function InfoRow({
    label,
    value,
    valueColor,
}: {
    label: string;
    value: string;
    valueColor?: string;
}) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">
                {label}
            </span>
            <span
                className="text-xs font-bold stat-number"
                style={{ color: valueColor }}
            >
                {value}
            </span>
        </div>
    );
}

export default function AlertPanel({
    transactionId,
    riskLevel,
    ifScore,
    aeScore,
    recommendation,
    confidence,
    amount,
    time,
    isFraud,
    ifLabel,
    aeLabel,
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
            } catch {
                if (!cancelled) {
                    setExplanation(
                        "Unable to generate explanation. The AI service may be unavailable."
                    );
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
            <div className="glass-card p-4 h-full flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">
                    🔍
                </div>
                <div className="text-center">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                        Select a transaction
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        to see AI-powered analysis
                    </p>
                </div>
            </div>
        );
    }

    const riskColor =
        riskLevel === "CRITICAL"
            ? "#ef4444"
            : riskLevel === "HIGH"
                ? "#f97316"
                : riskLevel === "MEDIUM"
                    ? "#f59e0b"
                    : "#10b981";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-4 h-full flex flex-col relative overflow-hidden"
        >
            {/* Glow header accent */}
            <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                    background: `linear-gradient(90deg, transparent, ${riskColor}, transparent)`,
                    boxShadow: `0 0 20px ${riskColor}40`,
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/5 flex-shrink-0">
                <div>
                    <h3 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em]">
                        AI Fraud Analysis
                    </h3>
                    <p className="text-[10px] stat-number text-[var(--color-text-muted)] mt-0.5">
                        Transaction #{transactionId}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {recommendation && (
                        <span
                            className={`text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-wider ${recommendation === "BLOCK"
                                    ? "bg-red-500/15 text-red-400 border border-red-500/20"
                                    : recommendation === "REVIEW"
                                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                }`}
                        >
                            {recommendation}
                        </span>
                    )}
                    {riskLevel && (
                        <span
                            className={`text-[10px] px-2.5 py-1 rounded-lg font-bold ${RISK_BG_CLASSES[riskLevel] || "risk-low"
                                }`}
                            style={{ textShadow: `0 0 10px ${riskColor}30` }}
                        >
                            {riskLevel}
                        </span>
                    )}
                </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-white/5 rounded-xl p-2.5 mb-3 flex-shrink-0">
                <div className="divide-y divide-white/5">
                    {amount !== null && (
                        <InfoRow
                            label="Amount"
                            value={`$${Math.abs(amount).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}`}
                            valueColor={
                                Math.abs(amount) > 500
                                    ? "#ef4444"
                                    : Math.abs(amount) > 100
                                        ? "#f59e0b"
                                        : "#10b981"
                            }
                        />
                    )}
                    {time !== null && (
                        <InfoRow
                            label="Time (seconds)"
                            value={time.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                            })}
                        />
                    )}
                    {isFraud !== null && (
                        <InfoRow
                            label="Ground Truth"
                            value={isFraud === 1 ? "FRAUD ⚠️" : "LEGITIMATE ✓"}
                            valueColor={isFraud === 1 ? "#ef4444" : "#10b981"}
                        />
                    )}
                </div>
            </div>

            {/* Dual Model Scores */}
            <div className="grid grid-cols-2 gap-2.5 mb-3 flex-shrink-0">
                <ScoreGauge
                    label="Isolation Forest"
                    value={ifScore ?? 0}
                    sublabel={ifLabel}
                    max={1}
                    formatFn={(v) => `${(v * 100).toFixed(1)}%`}
                    color={riskColor}
                />
                <ScoreGauge
                    label="Autoencoder Error"
                    value={aeScore ?? 0}
                    sublabel={aeLabel}
                    max={1}
                    formatFn={(v) => v.toFixed(4)}
                    color="#8b5cf6"
                />
            </div>

            {/* Combined Confidence */}
            {confidence !== null && (
                <div className="mb-3 bg-white/5 rounded-xl p-2.5 flex-shrink-0">
                    <div className="flex justify-between text-[10px] mb-1.5">
                        <span className="text-[var(--color-text-muted)] uppercase tracking-wider font-medium">
                            Combined Confidence
                        </span>
                        <span
                            className="font-bold stat-number"
                            style={{ color: riskColor }}
                        >
                            {(confidence * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${confidence * 100}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full rounded-full bar-glow"
                            style={{
                                background: `linear-gradient(90deg, ${riskColor}80, ${riskColor})`,
                                boxShadow: `0 0 12px ${riskColor}40`,
                            }}
                        />
                    </div>
                </div>
            )}

            {/* LLM Explanation — flexible height */}
            <div className="flex-1 bg-white/3 rounded-xl p-3 overflow-y-auto min-h-0">
                <p className="text-[9px] text-[var(--color-text-muted)] mb-1.5 uppercase tracking-[0.15em] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 pulse-dot" />
                    Gemini AI Explanation
                </p>
                <p
                    className={`text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line ${isStreaming ? "typing-caret" : ""
                        }`}
                >
                    {explanation || (isStreaming ? "" : "Loading analysis...")}
                </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 mt-3 flex-shrink-0">
                <button className="px-3 py-2 rounded-xl text-[10px] font-bold text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 uppercase tracking-wider">
                    🚫 Block
                </button>
                <button className="px-3 py-2 rounded-xl text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/25 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 uppercase tracking-wider">
                    👁️ Review
                </button>
                <button className="px-3 py-2 rounded-xl text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 uppercase tracking-wider">
                    ✅ Allow
                </button>
            </div>
        </motion.div>
    );
}
