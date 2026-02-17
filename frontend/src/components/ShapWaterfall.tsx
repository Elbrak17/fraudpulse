"use client";

import { motion } from "framer-motion";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
} from "recharts";
import { ShapValue } from "@/lib/api";

interface ShapWaterfallProps {
    shapValues: ShapValue[] | null;
    baseValue: number;
    loading?: boolean;
}

const LayersIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
    </svg>
);

export default function ShapWaterfall({
    shapValues,
    baseValue,
    loading,
}: ShapWaterfallProps) {
    if (loading) {
        return (
            <div className="glass-card p-4 h-full">
                <div className="flex items-center gap-2 mb-3">
                    <div className="section-icon bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        {LayersIcon}
                    </div>
                    <h3 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em]">
                        Explainable AI — SHAP Analysis
                    </h3>
                </div>
                <div className="h-64 shimmer rounded-lg" />
            </div>
        );
    }

    if (!shapValues || shapValues.length === 0) {
        return (
            <div className="glass-card p-4 h-full">
                <div className="flex items-center gap-2 mb-3">
                    <div className="section-icon bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        {LayersIcon}
                    </div>
                    <h3 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em]">
                        Explainable AI — SHAP Analysis
                    </h3>
                </div>
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    {/* Waveform SVG illustration */}
                    <svg width="64" height="40" viewBox="0 0 64 40" fill="none" className="opacity-30">
                        <path d="M2 20h8l4-14 4 28 4-18 4 10 4-6 4 12 4-20 4 14 4-8 4 4h8" stroke="url(#wave-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <defs>
                            <linearGradient id="wave-grad" x1="0" y1="20" x2="64" y2="20">
                                <stop stopColor="#8b5cf6" />
                                <stop offset="1" stopColor="#06b6d4" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <span className="text-[var(--color-text-muted)] text-xs">
                        Select a transaction to see feature contributions
                    </span>
                </div>
            </div>
        );
    }

    const top10 = shapValues.slice(0, 10).reverse();
    const chartData = top10.map((sv) => ({
        feature: sv.feature,
        value: sv.shap_value,
        originalValue: sv.value,
        fill: sv.shap_value < 0 ? "#ef4444" : "#10b981",
        glow:
            sv.shap_value < 0
                ? "drop-shadow(0 0 4px rgba(239,68,68,0.3))"
                : "drop-shadow(0 0 4px rgba(16,185,129,0.3))",
    }));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-4 h-full"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="section-icon bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        {LayersIcon}
                    </div>
                    <h3 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em]">
                        Explainable AI — SHAP Analysis
                    </h3>
                </div>
                <div className="flex items-center gap-3 text-[9px]">
                    <span className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-sm bg-red-500"
                            style={{ boxShadow: "0 0 8px rgba(239,68,68,0.4)" }}
                        />
                        <span className="text-[var(--color-text-muted)]">Fraud</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-sm bg-emerald-500"
                            style={{ boxShadow: "0 0 8px rgba(16,185,129,0.4)" }}
                        />
                        <span className="text-[var(--color-text-muted)]">Legit</span>
                    </span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 50, right: 20 }}
                >
                    <XAxis
                        type="number"
                        tick={{
                            fill: "var(--color-text-muted)",
                            fontSize: 9,
                            fontFamily: "var(--font-mono)",
                        }}
                        axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                        tickLine={false}
                    />
                    <YAxis
                        type="category"
                        dataKey="feature"
                        tick={{
                            fill: "var(--color-text-secondary)",
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "var(--color-bg-primary)",
                            border: "1px solid var(--color-border-glass)",
                            borderRadius: "12px",
                            color: "var(--color-text-primary)",
                            fontSize: "11px",
                            fontFamily: "var(--font-mono)",
                            boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
                            backdropFilter: "blur(12px)",
                        }}
                        labelStyle={{ color: "var(--color-text-secondary)" }}
                        itemStyle={{ color: "var(--color-text-primary)" }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, _: any, props: any) => [
                            `SHAP: ${Number(value).toFixed(4)} | Value: ${Number(
                                props?.payload?.originalValue ?? 0
                            ).toFixed(4)}`,
                            "Impact",
                        ]}
                    />
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
                        {chartData.map((entry, idx) => (
                            <Cell
                                key={idx}
                                fill={entry.fill}
                                fillOpacity={0.85}
                                style={{ filter: entry.glow }}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <p className="text-[9px] stat-number text-[var(--color-text-muted)] mt-2 text-center tracking-wider">
                Base value: {baseValue.toFixed(4)} — Features pushing prediction from
                base toward final score
            </p>
        </motion.div>
    );
}
