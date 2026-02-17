"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
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

const PieIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
);

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
            transition={{ delay: 0.3 }}
            className="glass-card p-4"
        >
            <div className="flex items-center gap-2 mb-3">
                <div className="section-icon bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    {PieIcon}
                </div>
                <h3 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em]">
                    Risk Distribution
                </h3>
            </div>

            <div className="flex items-center gap-4">
                <div className="w-36 h-36 relative">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0} animationBegin={0} animationDuration={800}>
                                    {data.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.color} fillOpacity={0.85} style={{ filter: `drop-shadow(0 0 6px ${entry.color}40)` }} />
                                    ))}
                                    <Label value={total.toString()} position="center" className="stat-number" style={{ fontSize: "20px", fontWeight: "700", fill: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }} />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full rounded-full shimmer" />
                    )}
                </div>

                <div className="flex-1 space-y-2.5">
                    {RISK_CONFIG.map((r, rIdx) => {
                        const count = transactions.filter((t) => t.risk_level === r.key).length;
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return (
                            <div key={r.key} className="space-y-1 group/legend cursor-default">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 transition-transform duration-200 group-hover/legend:scale-125" style={{ backgroundColor: r.color, boxShadow: `0 0 8px ${r.color}40` }} />
                                        <span className="text-[10px] text-[var(--color-text-secondary)] font-medium group-hover/legend:text-[var(--color-text-primary)] transition-colors duration-200">{r.label}</span>
                                    </div>
                                    <span className="text-[10px] stat-number text-[var(--color-text-primary)] font-bold">
                                        {count} <span className="text-[var(--color-text-muted)]">({pct.toFixed(1)}%)</span>
                                    </span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: rIdx * 0.1, ease: [0.4, 0, 0.2, 1] }} className="h-full rounded-full" style={{ backgroundColor: r.color, boxShadow: `0 0 8px ${r.color}30` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
