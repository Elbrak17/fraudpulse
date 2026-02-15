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

export default function TransactionFeed({
    transactions,
    connectionMode,
    onSelect,
    selectedId,
}: TransactionFeedProps) {
    return (
        <div className="glass-card p-4 flex flex-col h-full">
            {/* Header with scan-line */}
            <div className="relative flex items-center justify-between mb-3 pb-3 border-b border-white/5 scan-line">
                <h2 className="text-[10px] font-bold text-[var(--color-text-primary)] uppercase tracking-[0.15em]">
                    Live Transaction Feed
                </h2>
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
                                        ? "bg-white/10 border border-white/15"
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
                                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${RISK_BG_CLASSES[tx.risk_level] || "risk-low"
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
                    <div className="flex flex-col items-center justify-center h-32 gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                        <p className="text-[var(--color-text-muted)] text-xs">
                            Waiting for transactions...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
