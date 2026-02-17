"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { streamExplanation } from "@/lib/api";
import { RISK_BG_CLASSES } from "@/lib/constants";

interface AlertPanelProps {
    transactionId: number | null;
    dfIdx: number | null;
    riskLevel: string | null;
    ifScore: number | null;
    aeScore: number | null;
    recommendation: string | null;
    confidence: number | null;
    amount: number | null;
    isFraud: number | null;
    ifLabel: string | null;
    aeLabel: string | null;
}

const BrainIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
        <path d="M9.5 2A5.5 5.5 0 0 0 5 6a5.5 5.5 0 0 0 .96 3.09A5.5 5.5 0 0 0 4 13.5 5.5 5.5 0 0 0 8 18.77V22h3V2z" />
        <path d="M14.5 2A5.5 5.5 0 0 1 19 6a5.5 5.5 0 0 1-.96 3.09A5.5 5.5 0 0 1 20 13.5a5.5 5.5 0 0 1-4 5.27V22h-3V2z" />
    </svg>
);

const SparkleIcon = (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
        <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z" />
    </svg>
);

function ArcGauge({ value, color }: { value: number; color: string }) {
    const radius = 32;
    const circumference = Math.PI * radius;
    const pct = Math.min(value * 100, 100);
    const offset = circumference - (pct / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <svg width="80" height="48" viewBox="0 0 80 48" className="arc-gauge" style={{ "--gauge-color": `${color}40` } as React.CSSProperties}>
                <path d="M 8 44 A 32 32 0 0 1 72 44" className="arc-gauge-track" />
                <path d="M 8 44 A 32 32 0 0 1 72 44" className="arc-gauge-fill" stroke={color} strokeDasharray={circumference} strokeDashoffset={offset} />
                <text x="40" y="38" textAnchor="middle" fill="var(--color-text-primary)" fontSize="14" fontWeight="700" fontFamily="var(--font-mono)">{pct.toFixed(0)}%</text>
            </svg>
        </div>
    );
}

function ScoreGauge({ label, value, sublabel, max, formatFn, color }: {
    label: string; value: number; sublabel?: string | null;
    max: number; formatFn: (v: number) => string; color: string;
}) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="bg-white/5 rounded-xl p-3 relative overflow-hidden">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-1 uppercase tracking-wider font-medium">{label}</p>
            <div className="flex items-baseline gap-2">
                <p className="text-lg font-bold text-[var(--color-text-primary)] stat-number">{formatFn(value)}</p>
                {sublabel && (
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${sublabel === "fraud" ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                        {sublabel === "fraud" ? "ANOMALY" : "NORMAL"}
                    </span>
                )}
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1.5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full bar-glow" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}40` }} />
            </div>
        </div>
    );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">{label}</span>
            <span className="text-xs font-bold stat-number" style={{ color: valueColor }}>{value}</span>
        </div>
    );
}

export default function AlertPanel({
    transactionId, dfIdx, riskLevel, ifScore, aeScore, recommendation,
    confidence, amount, isFraud, ifLabel, aeLabel,
}: AlertPanelProps) {
    const [explanation, setExplanation] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const receivedAtRef = useRef<string | null>(null);

    useEffect(() => {
        if (transactionId === null || dfIdx === null) return;
        receivedAtRef.current = new Date().toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setExplanation("");
        setIsStreaming(true);
        let cancelled = false;
        (async () => {
            try {
                for await (const chunk of streamExplanation(dfIdx)) {
                    if (cancelled) break;
                    setExplanation((prev) => prev + chunk);
                }
            } catch {
                if (!cancelled) setExplanation("Unable to generate explanation. The AI service may be unavailable.");
            } finally {
                if (!cancelled) setIsStreaming(false);
            }
        })();
        return () => { cancelled = true; };
    }, [transactionId, dfIdx]);

    if (transactionId === null) {
        return (
            <div className="glass-card p-4 h-full flex flex-col items-center justify-center gap-4">
                {/* Click target SVG illustration */}
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-25">
                    <circle cx="24" cy="24" r="20" stroke="url(#click-grad)" strokeWidth="1.5" strokeDasharray="4 4" />
                    <circle cx="24" cy="24" r="12" stroke="url(#click-grad)" strokeWidth="1" />
                    <circle cx="24" cy="24" r="4" fill="url(#click-grad)" fillOpacity="0.4" />
                    <path d="M24 4v4M24 40v4M4 24h4M40 24h4" stroke="url(#click-grad)" strokeWidth="1" strokeLinecap="round" />
                    <defs>
                        <linearGradient id="click-grad" x1="4" y1="4" x2="44" y2="44">
                            <stop stopColor="#3b82f6" />
                            <stop offset="1" stopColor="#06b6d4" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="text-center">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">Select a transaction</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">to see AI-powered analysis</p>
                </div>
            </div>
        );
    }

    const riskColor = riskLevel === "CRITICAL" ? "#ef4444" : riskLevel === "HIGH" ? "#f97316" : riskLevel === "MEDIUM" ? "#f59e0b" : "#10b981";

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 h-full flex flex-col relative overflow-hidden">
            {/* Glow header accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${riskColor}, transparent)`, boxShadow: `0 0 20px ${riskColor}40` }} />

            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="section-icon bg-cyan-500/10 border border-cyan-500/20 rounded-lg">{BrainIcon}</div>
                    <div>
                        <h3 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em]">AI Fraud Analysis</h3>
                        <p className="text-[10px] stat-number text-[var(--color-text-muted)] mt-0.5">Transaction #{transactionId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {recommendation && (
                        <span className={`text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-wider ${recommendation === "BLOCK" ? "bg-red-500/15 text-red-400 border border-red-500/20" : recommendation === "REVIEW" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"}`}>{recommendation}</span>
                    )}
                    {riskLevel && (
                        <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold ${RISK_BG_CLASSES[riskLevel] || "risk-low"}`} style={{ textShadow: `0 0 10px ${riskColor}30` }}>{riskLevel}</span>
                    )}
                </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-white/5 rounded-xl p-2.5 mb-3 flex-shrink-0">
                <div className="divide-y divide-white/5">
                    {amount !== null && <InfoRow label="Amount" value={`$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} valueColor={Math.abs(amount) > 500 ? "#ef4444" : Math.abs(amount) > 100 ? "#f59e0b" : "#10b981"} />}
                    {receivedAtRef.current && <InfoRow label="Received At" value={receivedAtRef.current} />}
                    {isFraud !== null && <InfoRow label="Ground Truth" value={isFraud === 1 ? "FRAUD" : "LEGITIMATE"} valueColor={isFraud === 1 ? "#ef4444" : "#10b981"} />}
                </div>
            </div>

            {/* Arc Gauge for Confidence */}
            {confidence !== null && (
                <div className="mb-3 flex-shrink-0 flex items-center gap-3 bg-white/5 rounded-xl p-2.5">
                    <ArcGauge value={confidence} color={riskColor} />
                    <div className="flex-1">
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Combined Confidence</p>
                        <p className="text-lg font-bold stat-number mt-0.5" style={{ color: riskColor }}>{(confidence * 100).toFixed(1)}%</p>
                    </div>
                </div>
            )}

            {/* Dual Model Scores */}
            <div className="grid grid-cols-2 gap-2.5 mb-3 flex-shrink-0">
                <ScoreGauge label="Isolation Forest" value={ifScore ?? 0} sublabel={ifLabel} max={1} formatFn={(v) => `${(v * 100).toFixed(1)}%`} color={riskColor} />
                <ScoreGauge label="Autoencoder Error" value={aeScore ?? 0} sublabel={aeLabel} max={Math.max(1, Math.ceil((aeScore ?? 0) * 2) / 2)} formatFn={(v) => v.toFixed(4)} color="#8b5cf6" />
            </div>

            {/* LLM Explanation */}
            <div className="flex-1 bg-white/3 rounded-xl p-3 overflow-y-auto min-h-0">
                <p className="text-[9px] text-[var(--color-text-muted)] mb-1.5 uppercase tracking-[0.15em] font-medium flex items-center gap-1.5">
                    {SparkleIcon}
                    Gemini AI Explanation
                    {isStreaming && <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse ml-1" />}
                </p>
                {isStreaming && !explanation ? (
                    <div className="flex items-center gap-2 py-4">
                        <svg className="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-[11px] text-[var(--color-text-muted)]">Generating AI analysis...</span>
                    </div>
                ) : (
                    <p className={`text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line ${isStreaming ? "typing-caret" : ""}`}>
                        {explanation || "Select a transaction to generate analysis"}
                    </p>
                )}
            </div>
        </motion.div>
    );
}
