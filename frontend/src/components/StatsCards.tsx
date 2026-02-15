"use client";

import { motion } from "framer-motion";

interface StatCardProps {
    title: string;
    value: number;
    format?: "number" | "percent" | "currency";
    icon: string;
    gradient: string;
    glowClass: string;
    delay?: number;
}

function formatValue(value: number, format: string) {
    switch (format) {
        case "percent":
            return `${(value * 100).toFixed(1)}%`;
        case "currency":
            return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
        default:
            return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
}

function StatCard({
    title,
    value,
    format = "number",
    icon,
    gradient,
    glowClass,
    delay = 0,
}: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.5, ease: "easeOut" }}
            className={`glass-card p-5 relative overflow-hidden group hover:${glowClass}`}
        >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${gradient}`} />

            {/* Subtle background glow */}
            <div
                className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${gradient} opacity-[0.04] blur-2xl group-hover:opacity-[0.08] transition-opacity duration-500`}
            />

            <div className="flex items-start justify-between relative">
                <div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mb-2 uppercase tracking-[0.12em] font-medium">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                        <span className="stat-number">{formatValue(value, format)}</span>
                    </p>
                </div>
                <div
                    className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center text-base shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300`}
                >
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}

interface StatsCardsProps {
    stats: {
        total_transactions: number;
        flagged_transactions: number;
        fraud_rate: number;
        model_accuracy: number;
        blocked_amount: number;
        avg_risk_score: number;
    } | null;
}

export default function StatsCards({ stats }: StatsCardsProps) {
    if (!stats) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-card p-5 h-[88px] shimmer" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Total Analyzed"
                value={stats.total_transactions}
                icon="📊"
                gradient="gradient-blue"
                glowClass="glow-blue"
                delay={0}
            />
            <StatCard
                title="Flagged Fraud"
                value={stats.flagged_transactions}
                icon="🚨"
                gradient="gradient-danger"
                glowClass="glow-danger"
                delay={0.07}
            />
            <StatCard
                title="Model Accuracy"
                value={stats.model_accuracy}
                format="percent"
                icon="🎯"
                gradient="gradient-safe"
                glowClass="glow-safe"
                delay={0.14}
            />
            <StatCard
                title="Amount Blocked"
                value={stats.blocked_amount}
                format="currency"
                icon="🛡️"
                gradient="gradient-purple"
                glowClass="glow-purple"
                delay={0.21}
            />
        </div>
    );
}
