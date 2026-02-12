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
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
                    Live Transaction Feed
                </h2>
                <div className="flex items-center gap-2">
                    <span
                        className={`w-2 h-2 rounded-full pulse-dot ${connectionMode === "ws"
                                ? "bg-emerald-400"
                                : connectionMode === "poll"
                                    ? "bg-amber-400"
                                    : "bg-gray-400"
                            }`}
                    />
                    <span className="text-xs text-[var(--color-text-muted)] uppercase">
                        {connectionMode === "ws"
                            ? "WebSocket"
                            : connectionMode === "poll"
                                ? "Polling"
                                : "Connecting..."}
                    </span>
                </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
                <AnimatePresence mode="popLayout">
                    {transactions.map((tx) => (
                        <motion.div
                            key={`tx-${tx.id}-${tx.amount}`}
                            layout
                            initial={{ opacity: 0, x: -20, height: 0 }}
                            animate={{ opacity: 1, x: 0, height: "auto" }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => onSelect(tx)}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200
                ${selectedId === tx.id
                                    ? "bg-white/10 border border-white/15"
                                    : "hover:bg-white/5 border border-transparent"
                                }
                ${tx.risk_level === "CRITICAL" ? "pulse-danger" : ""}
              `}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Risk indicator */}
                                <div
                                    className={`w-2 h-8 rounded-full flex-shrink-0 ${tx.risk_level === "CRITICAL" || tx.risk_level === "HIGH"
                                            ? "gradient-danger"
                                            : tx.risk_level === "MEDIUM"
                                                ? "gradient-warning"
                                                : "gradient-safe"
                                        }`}
                                />

                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                        TX #{tx.id}
                                    </p>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        {tx.recommendation}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-sm font-mono text-[var(--color-text-primary)]">
                                    ${Math.abs(tx.amount).toFixed(2)}
                                </span>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_BG_CLASSES[tx.risk_level] || "risk-low"
                                        }`}
                                >
                                    {tx.risk_level}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {transactions.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-[var(--color-text-muted)] text-sm">
                        Waiting for transactions...
                    </div>
                )}
            </div>
        </div>
    );
}
