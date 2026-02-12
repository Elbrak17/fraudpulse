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
        // Group last 50 transactions into buckets of 5 for a smoother chart
        const data = [];
        const reversed = [...transactions].reverse();
        for (let i = 0; i < reversed.length; i += 5) {
            const bucket = reversed.slice(i, i + 5);
            const fraudCount = bucket.filter(
                (t) => t.risk_level === "CRITICAL" || t.risk_level === "HIGH"
            ).length;
            const avgRisk =
                bucket.reduce((sum, t) => sum + t.combined_confidence, 0) / bucket.length;
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
            className="glass-card p-4"
        >
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-3">
                Risk Trend — Real-Time
            </h3>

            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="index"
                            tick={{ fill: "#64748b", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: "#64748b", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 100]}
                            tickFormatter={(v: number) => `${v}%`}
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
                            formatter={(value: any) => [`${value}%`, "Avg Risk"]}
                        />
                        <Area
                            type="monotone"
                            dataKey="risk"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fill="url(#riskGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-[180px] flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                    Collecting data points...
                </div>
            )}
        </motion.div>
    );
}
