"use client";

import { motion } from "framer-motion";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import { StreamTransaction } from "@/lib/api";
import { useMemo } from "react";

interface TimelineChartProps {
    transactions: StreamTransaction[];
}

export default function TimelineChart({ transactions }: TimelineChartProps) {
    const chartData = useMemo(() => {
        const data = [];
        const reversed = [...transactions].reverse();
        for (let i = 0; i < reversed.length; i += 5) {
            const bucket = reversed.slice(i, i + 5);
            const fraudCount = bucket.filter(
                (t) => t.risk_level === "CRITICAL" || t.risk_level === "HIGH"
            ).length;
            const avgRisk =
                bucket.reduce((sum, t) => sum + t.combined_confidence, 0) /
                bucket.length;
            data.push({
                index: Math.floor(i / 5),
                risk: Math.round(avgRisk * 100),
                alerts: fraudCount,
                total: bucket.length,
            });
        }
        return data;
    }, [transactions]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4"
        >
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em]">
                    Risk Trend — Real-Time
                </h3>
                {chartData.length > 0 && (
                    <span className="text-[10px] stat-number text-[var(--color-text-muted)]">
                        {chartData.length} data points
                    </span>
                )}
            </div>

            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                                <stop offset="50%" stopColor="#ef4444" stopOpacity={0.1} />
                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.04)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="index"
                            tick={{ fill: "#475569", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: "#475569", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 100]}
                            tickFormatter={(v: number) => `${v}%`}
                            width={35}
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
                            formatter={(value: any) => [`${value}%`, "Avg Risk"]}
                        />
                        <Area
                            type="monotone"
                            dataKey="risk"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fill="url(#riskGradient)"
                            dot={false}
                            activeDot={{
                                r: 4,
                                fill: "#ef4444",
                                stroke: "rgba(239,68,68,0.3)",
                                strokeWidth: 6,
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-[180px] flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                    <span className="text-[var(--color-text-muted)] text-xs">
                        Collecting data points...
                    </span>
                </div>
            )}
        </motion.div>
    );
}
