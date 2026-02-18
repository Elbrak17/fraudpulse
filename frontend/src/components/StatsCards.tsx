"use client";

import { motion } from "framer-motion";

interface StatCardProps {
    title: string;
    value: number;
    format?: "number" | "percent" | "currency";
    gradient: string;
    glowClass: string;
    delay?: number;
    icon: React.ReactNode;
}

function formatValue(value: number, format: string) {
    switch (format) {
        case "percent":
            return `${(value * 100).toFixed(1)}%`;
        case "currency":
            return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        default:
            return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
}

function StatCard({
    title,
    value,
    format = "number",
    gradient,
    glowClass,
    delay = 0,
    icon,
}: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.5, ease: "easeOut" }}
            className={`glass-card card-shine p-5 relative overflow-hidden group hover:${glowClass}`}
        >
            {/* Gradient accent bar — animated shimmer */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${gradient}`} />

            {/* Subtle background glow */}
            <div
                className={`absolute -top-8 -right-8 w-28 h-28 rounded-full ${gradient} opacity-[0.03] blur-2xl group-hover:opacity-[0.07] transition-opacity duration-700`}
            />

            <div className="flex items-start justify-between relative">
                <div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mb-2 uppercase tracking-[0.12em] font-medium">
                        {title}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-[var(--color-text-primary)]">
                        <span className="stat-number animate-count-in">{formatValue(value, format)}</span>
                    </p>
                </div>
                {/* SVG Icon */}
                <div className={`section-icon ${gradient} opacity-80 group-hover:opacity-100 transition-opacity duration-500`}>
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}

/* ── SVG Icons ─────────────────────────────────────── */

const IconBarChart = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="9" rx="1" />
        <rect x="10" y="7" width="4" height="14" rx="1" />
        <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
);

const IconShield = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);

const IconTarget = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

const IconDollar = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);

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
                    <div key={i} className="glass-card p-5 h-[92px] shimmer" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Total Analyzed"
                value={stats.total_transactions}
                gradient="gradient-blue"
                glowClass="glow-blue"
                delay={0}
                icon={IconBarChart}
            />
            <StatCard
                title="Flagged Fraud"
                value={stats.flagged_transactions}
                gradient="gradient-danger"
                glowClass="glow-danger"
                delay={0.07}
                icon={IconShield}
            />
            <StatCard
                title="Model Accuracy"
                value={stats.model_accuracy}
                format="percent"
                gradient="gradient-safe"
                glowClass="glow-safe"
                delay={0.14}
                icon={IconTarget}
            />
            <StatCard
                title="Amount Blocked"
                value={stats.blocked_amount}
                format="currency"
                gradient="gradient-purple"
                glowClass="glow-purple"
                delay={0.21}
                icon={IconDollar}
            />
        </div>
    );
}
