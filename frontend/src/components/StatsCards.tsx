"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface StatCardProps {
    title: string;
    value: number;
    format?: "number" | "percent" | "currency";
    icon: string;
    gradient: string;
    delay?: number;
}

function AnimatedValue({ target, format }: { target: number; format: string }) {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const duration = 1500;
        const steps = 60;
        const increment = target / steps;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            setCurrent(Math.min(increment * step, target));
            if (step >= steps) clearInterval(timer);
        }, duration / steps);

        return () => clearInterval(timer);
    }, [target]);

    const formatted = (() => {
        switch (format) {
            case "percent":
                return `${(current * 100).toFixed(1)}%`;
            case "currency":
                return `$${current.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
            default:
                return current.toLocaleString("en-US", { maximumFractionDigits: 0 });
        }
    })();

    return <span className="stat-number">{formatted}</span>;
}

function StatCard({ title, value, format = "number", icon, gradient, delay = 0 }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: "easeOut" }}
            className="glass-card p-5 relative overflow-hidden group"
        >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${gradient}`} />

            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-1">{title}</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                        <AnimatedValue target={value} format={format} />
                    </p>
                </div>
                <div className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">
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
                    <div key={i} className="glass-card p-5 h-24 shimmer" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Total Transactions"
                value={stats.total_transactions}
                icon="📊"
                gradient="gradient-blue"
                delay={0}
            />
            <StatCard
                title="Flagged as Fraud"
                value={stats.flagged_transactions}
                icon="🚨"
                gradient="gradient-danger"
                delay={0.1}
            />
            <StatCard
                title="Model Accuracy"
                value={stats.model_accuracy}
                format="percent"
                icon="🎯"
                gradient="gradient-safe"
                delay={0.2}
            />
            <StatCard
                title="Amount Blocked"
                value={stats.blocked_amount}
                format="currency"
                icon="🛡️"
                gradient="gradient-purple"
                delay={0.3}
            />
        </div>
    );
}
