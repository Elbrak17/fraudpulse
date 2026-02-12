"use client";

import { motion } from "framer-motion";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from "recharts";
import { StreamTransaction } from "@/lib/api";
import { useMemo } from "react";

interface RiskDistributionProps {
    transactions: StreamTransaction[];
}

const RISK_CONFIG = [
    { key: "CRITICAL", color: "#ef4444", label: "Critical" },
    { key: "HIGH", color: "#f97316", label: "High" },
    { key: "MEDIUM", color: "#f59e0b", label: "Medium" },
    { key: "LOW", color: "#10b981", label: "Low" },
];

export default function RiskDistribution({ transactions }: RiskDistributionProps) {
    const data = useMemo(() => {
        const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        for (const tx of transactions) {
            if (tx.risk_level in counts) {
                counts[tx.risk_level as keyof typeof counts]++;
            }
        }
        return RISK_CONFIG.map((r) => ({
            name: r.label,
            value: counts[r.key as keyof typeof counts],
            color: r.color,
        })).filter((d) => d.value > 0);
    }, [transactions]);

    const total = transactions.length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
        >
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-3">
                Risk Distribution
            </h3>

            <div className="flex items-center gap-4">
                <div className="w-32 h-32">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={35}
                                    outerRadius={55}
                                    paddingAngle={4}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {data.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full rounded-full shimmer" />
                    )}
                </div>

                <div className="flex-1 space-y-2">
                    {RISK_CONFIG.map((r) => {
                        const count = transactions.filter((t) => t.risk_level === r.key).length;
                        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
                        return (
                            <div key={r.key} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: r.color }}
                                />
                                <span className="text-xs text-[var(--color-text-secondary)] flex-1">
                                    {r.label}
                                </span>
                                <span className="text-xs font-mono text-[var(--color-text-primary)]">
                                    {count}
                                </span>
                                <span className="text-xs text-[var(--color-text-muted)] w-12 text-right">
                                    {pct}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
