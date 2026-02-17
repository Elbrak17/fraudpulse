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

const TrendIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

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
                <div className="flex items-center gap-2">
                    <div className="section-icon bg-red-500/10 border border-red-500/20 rounded-lg">
                        {TrendIcon}
                    </div>
                    <h3 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em]">
                        Risk Trend — Real-Time
                    </h3>
                </div>
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
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="50%" stopColor="#ef4444" stopOpacity={0.08} />
                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.03)"
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
                                background: "rgba(10, 15, 28, 0.95)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "12px",
                                color: "#f1f5f9",
                                fontSize: "11px",
                                fontFamily: "var(--font-mono)",
                                boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
                                backdropFilter: "blur(12px)",
                            }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value: any) => [`${value}%`, "Avg Risk"]}
                        />
                        <Area
                            type="monotone"
                            dataKey="alerts"
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                            fill="url(#alertGradient)"
                            dot={false}
                            strokeOpacity={0.6}
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
                <div className="h-[180px] flex flex-col items-center justify-center gap-3">
                    {/* Pulse line SVG */}
                    <svg width="80" height="32" viewBox="0 0 80 32" fill="none" className="opacity-30">
                        <path
                            d="M0 16h20l4-12 4 24 4-16 4 8 4-4 4 10 4-14h20"
                            stroke="url(#pulse-empty-grad)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <defs>
                            <linearGradient id="pulse-empty-grad" x1="0" y1="16" x2="80" y2="16">
                                <stop stopColor="#ef4444" stopOpacity="0" />
                                <stop offset="0.5" stopColor="#ef4444" />
                                <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <span className="text-[var(--color-text-muted)] text-xs">
                        Collecting data points...
                    </span>
                </div>
            )}
        </motion.div>
    );
}
