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

export default function ShapWaterfall({ shapValues, baseValue, loading }: ShapWaterfallProps) {
    if (loading) {
        return (
            <div className="glass-card p-4 h-full">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-3">
                    Explainable AI — SHAP Analysis
                </h3>
                <div className="h-64 shimmer rounded-lg" />
            </div>
        );
    }

    if (!shapValues || shapValues.length === 0) {
        return (
            <div className="glass-card p-4 h-full">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-3">
                    Explainable AI — SHAP Analysis
                </h3>
                <div className="flex items-center justify-center h-64 text-[var(--color-text-muted)] text-sm">
                    Select a transaction to see feature contributions
                </div>
            </div>
        );
    }

    // Take top 10 features
    const top10 = shapValues.slice(0, 10).reverse();
    const chartData = top10.map((sv) => ({
        feature: sv.feature,
        value: sv.shap_value,
        originalValue: sv.value,
        fill: sv.shap_value > 0 ? "#ef4444" : "#10b981",
    }));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-4 h-full"
        >
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
                    Explainable AI — SHAP Analysis
                </h3>
                <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm bg-red-500" /> Pushes to Fraud
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Pushes to Legit
                    </span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 50, right: 20 }}>
                    <XAxis
                        type="number"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                        tickLine={false}
                    />
                    <YAxis
                        type="category"
                        dataKey="feature"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "rgba(15, 23, 42, 0.95)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            color: "#f1f5f9",
                            fontSize: "12px",
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, _: any, props: any) => [
                            `SHAP: ${Number(value).toFixed(4)} | Value: ${Number(props?.payload?.originalValue ?? 0).toFixed(4)}`,
                            "Impact",
                        ]}
                    />
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} fillOpacity={0.8} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <p className="text-xs text-[var(--color-text-muted)] mt-2 text-center">
                Base value: {baseValue.toFixed(4)} — Features pushing prediction from base toward final score
            </p>
        </motion.div>
    );
}
