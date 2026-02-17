"use client";

import { motion, AnimatePresence } from "framer-motion";
import { StreamTransaction } from "@/lib/api";
import { RISK_BG_CLASSES } from "@/lib/constants";

interface TransactionFeedProps {
    transactions: StreamTransaction[];
    connectionMode: "ws" | "poll" | "connecting";
    onSelect: (tx: StreamTransaction) => void;
    selectedId: number | null;
}

const RadioIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 2.28-1.49" />
        <path d="M10.71 5.05A16 16 0 0 0 2 12.55" />
        <path d="M22 12.55A16 16 0 0 0 13.29 5.05" />
        <circle cx="12" cy="17" r="3" />
    </svg>
);

export default function TransactionFeed({
    transactions,
    connectionMode,
    onSelect,
    selectedId,
}: TransactionFeedProps) {
    return (
        <div className="glass-card p-4 flex flex-col h-full">
            {/* Header */}
            <div className="relative flex items-center justify-between mb-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="section-icon bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        {RadioIcon}
                    </div>
                    <h2 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em]">
                        Live Transaction Feed
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span
                            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionMode === "ws"
                                ? "bg-emerald-400 animate-ping"
                                : connectionMode === "poll"
                                    ? "bg-amber-400"
                                    : "bg-gray-400"
                                }`}
                        />
                        <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${connectionMode === "ws"
                                ? "bg-emerald-400"
                                : connectionMode === "poll"
                                    ? "bg-amber-400"
                                    : "bg-gray-400"
                                }`}
                        />
                    </span>
                    <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">
                        {connectionMode === "ws"
                            ? "WebSocket"
                            : connectionMode === "poll"
                                ? "Polling"
                                : "Connecting..."}
                    </span>
                </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                <AnimatePresence mode="popLayout">
                    {transactions.map((tx, index) => {
                        const isNew = index === 0;
                        const isCritical = tx.risk_level === "CRITICAL";
                        const isHighRisk =
                            tx.risk_level === "CRITICAL" || tx.risk_level === "HIGH";
                        const isSelected = selectedId === tx.id;

                        return (
                            <motion.div
                                key={`tx-${tx.id}-${tx.amount}`}
                                layout
                                initial={{ opacity: 0, x: -30, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 30, scale: 0.95 }}
                                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                                onClick={() => onSelect(tx)}
                                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-200
                  ${isSelected
                                        ? "bg-white/10 border border-white/15 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]"
                                        : "hover:bg-white/5 border border-transparent"
                                    }
                  ${isCritical ? "pulse-danger" : ""}
                  ${isHighRisk && !isSelected
                                        ? "border-l-2 border-l-red-500/40"
                                        : ""
                                    }
                `}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {/* Risk indicator bar */}
                                    <div
                                        className={`w-1.5 h-8 rounded-full flex-shrink-0 ${isHighRisk
                                            ? "gradient-danger"
                                            : tx.risk_level === "MEDIUM"
                                                ? "gradient-warning"
                                                : "gradient-safe"
                                            }`}
                                    />

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate stat-number">
                                                TX #{tx.id}
                                            </p>
                                            {isNew && <span className="badge-new">New</span>}
                                        </div>
                                        <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                                            {tx.recommendation}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span
                                        className={`text-xs font-bold stat-number ${isHighRisk
                                            ? "text-red-400"
                                            : tx.risk_level === "MEDIUM"
                                                ? "text-amber-400"
                                                : "text-emerald-400"
                                            }`}
                                    >
                                        ${Math.abs(tx.amount).toFixed(2)}
                                    </span>
                                    <span
                                        className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${RISK_BG_CLASSES[tx.risk_level] || "risk-low"
                                            }`}
                                    >
                                        {tx.risk_level}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {transactions.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 gap-4 overflow-hidden">
                        {/* Radar SVG animation */}
                        <div className="relative w-16 h-16">
                            <svg viewBox="0 0 64 64" className="w-full h-full">
                                {/* Outer ring */}
                                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="1" />
                                <circle cx="32" cy="32" r="20" fill="none" stroke="rgba(59,130,246,0.08)" strokeWidth="1" />
                                <circle cx="32" cy="32" r="12" fill="none" stroke="rgba(59,130,246,0.06)" strokeWidth="1" />
                                {/* Center dot */}
                                <circle cx="32" cy="32" r="2" fill="rgba(59,130,246,0.6)" />
                                {/* Sweep line */}
                                <line
                                    x1="32" y1="32" x2="32" y2="4"
                                    stroke="url(#radar-sweep-grad)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    style={{ transformOrigin: "32px 32px", animation: "radar-sweep 3s linear infinite" }}
                                />
                                {/* Ping dot */}
                                <circle cx="42" cy="18" r="1.5" fill="#3b82f6" opacity="0.5" style={{ animation: "radar-ping 3s ease-out infinite" }} />
                                <defs>
                                    <linearGradient id="radar-sweep-grad" x1="32" y1="32" x2="32" y2="4">
                                        <stop offset="0%" stopColor="rgba(59,130,246,0)" />
                                        <stop offset="100%" stopColor="rgba(59,130,246,0.6)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-wider">
                            Scanning for transactions...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
