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

export default function ShapWaterfall({
    shapValues,
    baseValue,
    loading,
}: ShapWaterfallProps) {
    if (loading) {
        return (
            <div className="glass-card p-4 h-full">
                <h3 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em] mb-3">
                    Explainable AI — SHAP Analysis
                </h3>
                <div className="h-64 shimmer rounded-lg" />
            </div>
        );
    }

    if (!shapValues || shapValues.length === 0) {
        return (
            <div className="glass-card p-4 h-full">
                <h3 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em] mb-3">
                    Explainable AI — SHAP Analysis
                </h3>
                <div className="flex flex-col items-center justify-center h-64 gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg">
                        🧠
                    </div>
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
        fill: sv.shap_value > 0 ? "#ef4444" : "#10b981",
        glow:
            sv.shap_value > 0
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
                <h3 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em]">
                    Explainable AI — SHAP Analysis
                </h3>
                <div className="flex items-center gap-3 text-[9px]">
                    <span className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-sm bg-red-500"
                            style={{ boxShadow: "0 0 8px rgba(239,68,68,0.4)" }}
                        />
                        <span className="text-[var(--color-text-muted)]">→ Fraud</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-sm bg-emerald-500"
                            style={{ boxShadow: "0 0 8px rgba(16,185,129,0.4)" }}
                        />
                        <span className="text-[var(--color-text-muted)]">→ Legit</span>
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
                            fill: "#475569",
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
                            fill: "#94a3b8",
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "rgba(12, 18, 32, 0.95)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "12px",
                            color: "#f1f5f9",
                            fontSize: "11px",
                            fontFamily: "var(--font-mono)",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                        }}
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
